// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GrantVault} from "./GrantVault.sol";
import {GrantConfig, MilestoneInput, Milestone, UnlockStrategy} from "./GrantTypes.sol";

/// @notice Versioned GrantVault extension supporting 1-of-N and M-of-N milestone approval quorums.
/// @dev Existing single-reviewer GrantVaults remain unchanged.
contract QuorumGrantVault is GrantVault {
    error DuplicateReviewer();
    error InvalidQuorumThreshold();
    error ReviewerAlreadyApproved();

    uint256 public constant MAX_REVIEWERS = 10;

    address[] internal _reviewers;
    uint256 public immutable threshold;

    mapping(address => bool) public isReviewer;
    // milestoneIndex => (reviewerAddress => hasApproved)
    mapping(uint256 => mapping(address => bool)) public hasApprovedMilestone;
    // milestoneIndex => totalUniqueApprovals
    mapping(uint256 => uint256) public milestoneApprovalCount;

    event MilestoneApprovalSubmitted(
        address indexed reviewer, uint256 indexed index, uint256 currentApprovals, uint256 threshold
    );

    constructor(
        address issuer_,
        GrantConfig memory config,
        address[] memory reviewers_,
        uint256 threshold_,
        MilestoneInput[] memory inputs
    ) GrantVault(issuer_, config, inputs) {
        if (config.strategy != UnlockStrategy.TIME) {
            if (reviewers_.length == 0 || reviewers_.length > MAX_REVIEWERS) {
                revert InvalidAddress();
            }
            if (threshold_ == 0 || threshold_ > reviewers_.length) {
                revert InvalidQuorumThreshold();
            }
            for (uint256 i; i < reviewers_.length; ++i) {
                address rev = reviewers_[i];
                if (rev == address(0)) revert InvalidAddress();
                if (isReviewer[rev]) revert DuplicateReviewer();
                isReviewer[rev] = true;
                _reviewers.push(rev);
            }
            threshold = threshold_;
        } else {
            threshold = 0;
        }
    }

    /// @notice Marker used by Cloud to distinguish this version from legacy single-reviewer vaults.
    function supportsQuorumReviewers() external pure returns (bool) {
        return true;
    }

    /// @notice Returns the full set of designated reviewers.
    function getReviewers() external view returns (address[] memory) {
        return _reviewers;
    }

    /// @notice Returns the total count of designated reviewers.
    function getReviewerCount() external view returns (uint256) {
        return _reviewers.length;
    }

    /// @notice Returns whether a specific reviewer has approved a milestone.
    function hasApproved(uint256 index, address reviewer_) external view returns (bool) {
        return hasApprovedMilestone[index][reviewer_];
    }

    /// @notice Returns the live approval progress for a milestone.
    function getMilestoneApprovalProgress(uint256 index)
        external
        view
        returns (uint256 approvals, uint256 quorumThreshold, bool isFullyApproved)
    {
        if (index >= milestones.length) revert InvalidMilestoneIndex();
        return (milestoneApprovalCount[index], threshold, milestones[index].approved);
    }

    /// @notice Submits a reviewer approval for a milestone. Unlocks tokens once threshold is satisfied.
    function approveMilestone(uint256 index) public override {
        if (revoked) revert AlreadyRevoked();
        if (!isReviewer[msg.sender]) revert UnauthorizedReviewer();
        if (index >= milestones.length) revert InvalidMilestoneIndex();

        Milestone storage milestone = milestones[index];
        if (milestone.approved) revert MilestoneAlreadyApproved();
        if (hasApprovedMilestone[index][msg.sender]) revert ReviewerAlreadyApproved();

        hasApprovedMilestone[index][msg.sender] = true;
        uint256 current = ++milestoneApprovalCount[index];

        emit MilestoneApprovalSubmitted(msg.sender, index, current, threshold);

        if (current == threshold) {
            milestone.approved = true;
            milestoneUnlockedAmount += milestone.amount;
            emit MilestoneApproved(msg.sender, index, milestone.amount);
        }
    }
}
