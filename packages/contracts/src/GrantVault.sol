// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GrantConfig, MilestoneInput, Milestone, UnlockStrategy} from "./GrantTypes.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IEligibilityProvider} from "./IEligibilityProvider.sol";

/// @notice A single grant with immutable terms and optional issuer revocation.
contract GrantVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error UnauthorizedReviewer();
    error InvalidMilestoneIndex();
    error MilestoneAlreadyApproved();
    error UnauthorizedBeneficiary();
    error NothingToClaim();
    error BeneficiaryNotEligible();
    error InvalidSchedule();
    error InvalidAllocation();
    error InvalidMilestones();
    error InvalidInitialUnlock();
    error GrantNotRevocable();
    error AlreadyRevoked();
    error UnauthorizedIssuer();

    uint256 public constant MAX_MILESTONES = 20;
    string public title;
    address public immutable issuer;
    address public immutable beneficiary;
    address public immutable reviewer;
    address public immutable token;
    uint256 public immutable totalAllocation;
    uint256 public immutable initialUnlock;
    UnlockStrategy public immutable strategy;
    uint256 public immutable start;
    uint256 public immutable cliff;
    uint256 public immutable duration;
    address public immutable eligibilityProvider;
    bool public immutable revocable;
    bool public revoked;
    uint256 public revokedAt;
    uint256 public revocationEarnedAmount;
    uint256 public claimedAmount;
    uint256 public milestoneUnlockedAmount;
    Milestone[] private milestones;

    event MilestoneApproved(address indexed reviewer, uint256 indexed index, uint256 amount);
    event TokensClaimed(address indexed beneficiary, address indexed token, uint256 amount, uint256 totalClaimed);
    event GrantRevoked(address indexed issuer, uint256 recoveredAmount, uint256 earnedAmount);

    constructor(address issuer_, GrantConfig memory config, MilestoneInput[] memory inputs) {
        if (issuer_ == address(0) || config.beneficiary == address(0)) revert InvalidAddress();
        if (config.token.code.length == 0) revert InvalidAddress();
        if (config.eligibilityProvider != address(0) && config.eligibilityProvider.code.length == 0) {
            revert InvalidAddress();
        }
        if (config.totalAllocation == 0) revert InvalidAllocation();
        if (config.initialUnlock > config.totalAllocation) revert InvalidInitialUnlock();
        if (config.strategy == UnlockStrategy.MILESTONE && config.initialUnlock > 0) {
            revert InvalidInitialUnlock();
        }
        if (
            config.strategy != UnlockStrategy.MILESTONE
                && (config.duration == 0
                    || config.cliff > config.duration
                    || config.start > type(uint256).max - config.duration)
        ) revert InvalidSchedule();
        if (config.strategy == UnlockStrategy.TIME) {
            if (inputs.length != 0) revert InvalidMilestones();
        } else {
            if (config.reviewer == address(0)) revert InvalidAddress();
            if (inputs.length == 0 || inputs.length > MAX_MILESTONES) revert InvalidMilestones();
            uint256 expectedMilestoneSum = config.strategy == UnlockStrategy.HYBRID
                ? config.totalAllocation - config.initialUnlock
                : config.totalAllocation;
            if (expectedMilestoneSum == 0) revert InvalidInitialUnlock();
            uint256 sum;
            for (uint256 i; i < inputs.length; ++i) {
                uint256 amount = inputs[i].amount;
                // Subtraction also prevents an overflowing sum from creating malformed economics.
                if (amount == 0 || amount > expectedMilestoneSum - sum) revert InvalidMilestones();
                sum += amount;
            }
            if (sum != expectedMilestoneSum) revert InvalidMilestones();
        }
        title = config.title;
        issuer = issuer_;
        beneficiary = config.beneficiary;
        reviewer = config.reviewer;
        token = config.token;
        totalAllocation = config.totalAllocation;
        initialUnlock = config.initialUnlock;
        strategy = config.strategy;
        start = config.start;
        cliff = config.cliff;
        duration = config.duration;
        eligibilityProvider = config.eligibilityProvider;
        revocable = config.revocable;
        for (uint256 i; i < inputs.length; ++i) {
            milestones.push(Milestone(inputs[i].title, inputs[i].amount, false));
        }
    }

    function getMilestones() external view returns (Milestone[] memory) {
        return milestones;
    }

    function approveMilestone(uint256 index) external {
        if (revoked) revert AlreadyRevoked();
        if (msg.sender != reviewer) revert UnauthorizedReviewer();
        if (index >= milestones.length) revert InvalidMilestoneIndex();
        Milestone storage milestone = milestones[index];
        if (milestone.approved) revert MilestoneAlreadyApproved();
        milestone.approved = true;
        milestoneUnlockedAmount += milestone.amount;
        emit MilestoneApproved(msg.sender, index, milestone.amount);
    }

    /// @notice The cliff delays access to the vesting allocation, while initialUnlock is accessible at start.
    /// @dev Milestone-only grants have no time condition and return zero here.
    function vestedByTime() public view returns (uint256) {
        if (strategy == UnlockStrategy.MILESTONE) return 0;
        uint256 effectiveTime = revoked ? revokedAt : block.timestamp;
        if (effectiveTime < start) return 0;
        if (effectiveTime < start + cliff) return initialUnlock;
        if (effectiveTime >= start + duration) return totalAllocation;
        uint256 vestingAllocation = totalAllocation - initialUnlock;
        return initialUnlock + Math.mulDiv(vestingAllocation, effectiveTime - start, duration);
    }

    function unlockedAmount() public view returns (uint256) {
        if (revoked) return revocationEarnedAmount;
        if (strategy == UnlockStrategy.MILESTONE) return milestoneUnlockedAmount;
        if (strategy == UnlockStrategy.HYBRID) {
            if (block.timestamp < start) return 0;
            uint256 vestingTimeUnlocked = vestedByTime() - initialUnlock;
            return initialUnlock + Math.min(vestingTimeUnlocked, milestoneUnlockedAmount);
        }
        return vestedByTime();
    }

    function claimableAmount() public view returns (uint256) {
        return unlockedAmount() - claimedAmount;
    }

    function claim() external nonReentrant {
        if (msg.sender != beneficiary) revert UnauthorizedBeneficiary();
        _claim(claimableAmount());
    }

    /// @dev Shared claim settlement for the beneficiary path and versioned
    /// signed-claim extensions. The caller must authorize the path first.
    function _claim(uint256 amount) internal {
        if (eligibilityProvider != address(0) && !IEligibilityProvider(eligibilityProvider).isEligible(beneficiary)) {
            revert BeneficiaryNotEligible();
        }
        if (amount == 0 || amount > claimableAmount()) revert NothingToClaim();
        claimedAmount += amount;
        IERC20(token).safeTransfer(beneficiary, amount);
        emit TokensClaimed(beneficiary, token, amount, claimedAmount);
    }

    function revoke() external nonReentrant {
        if (!revocable) revert GrantNotRevocable();
        if (revoked) revert AlreadyRevoked();
        if (msg.sender != issuer) revert UnauthorizedIssuer();

        uint256 earned = unlockedAmount();
        if (earned < claimedAmount) {
            earned = claimedAmount;
        }
        if (earned > totalAllocation) {
            earned = totalAllocation;
        }

        revoked = true;
        revokedAt = block.timestamp;
        revocationEarnedAmount = earned;

        uint256 recovered = totalAllocation - earned;
        if (recovered != 0) {
            IERC20(token).safeTransfer(issuer, recovered);
        }

        emit GrantRevoked(msg.sender, recovered, earned);
    }
}
