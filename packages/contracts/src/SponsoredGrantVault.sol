// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import {GrantVault} from "./GrantVault.sol";
import {GrantConfig, MilestoneInput} from "./GrantTypes.sol";

/// @notice Versioned GrantVault extension for beneficiary-authorized claims
/// and reviewer-authorized milestone approvals submitted by a gas relayer.
/// Existing GrantVaults remain unchanged and every wallet-paid path remains.
contract SponsoredGrantVault is GrantVault, EIP712 {
    error SponsoredActionExpired();
    error SponsoredActionNonceMismatch();
    error SponsoredActionAmountUnavailable();
    error SponsoredActionSignatureInvalid();
    error UnauthorizedRelayer();

    bytes32 public constant SPONSORED_CLAIM_TYPEHASH = keccak256(
        "SponsoredClaim(address vault,address beneficiary,uint256 amount,uint256 nonce,uint256 deadline,address relayer)"
    );
    bytes32 public constant SPONSORED_MILESTONE_APPROVAL_TYPEHASH = keccak256(
        "SponsoredMilestoneApproval(address vault,address reviewer,uint256 milestoneIndex,uint256 nonce,uint256 deadline,address relayer)"
    );

    uint256 public sponsoredClaimNonce;
    uint256 public sponsoredReviewNonce;

    event SponsoredClaimExecuted(
        address indexed relayer, address indexed beneficiary, uint256 amount, uint256 indexed nonce
    );
    event SponsoredMilestoneApprovalExecuted(
        address indexed relayer, address indexed reviewer, uint256 indexed milestoneIndex, uint256 nonce
    );

    constructor(address issuer_, GrantConfig memory config, MilestoneInput[] memory inputs)
        GrantVault(issuer_, config, inputs)
        EIP712("HashVest Sponsored Actions", "2")
    {}

    /// @notice Legacy marker retained for clients that only know signed claims.
    function supportsSponsoredClaims() external pure returns (bool) {
        return true;
    }

    /// @notice Marker used by Cloud to require the generalized v2 surface.
    function supportsSponsoredActions() external pure returns (bool) {
        return true;
    }

    function sponsorshipVersion() external pure returns (uint256) {
        return 2;
    }

    /// @notice Return the exact EIP-712 digest expected by claimWithSignature.
    function hashSponsoredClaim(uint256 amount, uint256 nonce, uint256 deadline, address relayer)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(SPONSORED_CLAIM_TYPEHASH, address(this), beneficiary, amount, nonce, deadline, relayer)
            )
        );
    }

    /// @notice Settle one exact claim after the beneficiary signs intent.
    /// @dev The relayer is part of the signed payload and must submit the call.
    function claimWithSignature(
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        address relayer,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert SponsoredActionExpired();
        if (nonce != sponsoredClaimNonce) revert SponsoredActionNonceMismatch();
        if (relayer == address(0) || msg.sender != relayer) revert UnauthorizedRelayer();
        if (amount == 0 || amount > claimableAmount()) revert SponsoredActionAmountUnavailable();
        if (ECDSA.recover(hashSponsoredClaim(amount, nonce, deadline, relayer), signature) != beneficiary) {
            revert SponsoredActionSignatureInvalid();
        }

        sponsoredClaimNonce = nonce + 1;
        _claim(amount);
        emit SponsoredClaimExecuted(msg.sender, beneficiary, amount, nonce);
    }

    function hashSponsoredMilestoneApproval(uint256 milestoneIndex, uint256 nonce, uint256 deadline, address relayer)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    SPONSORED_MILESTONE_APPROVAL_TYPEHASH,
                    address(this),
                    reviewer,
                    milestoneIndex,
                    nonce,
                    deadline,
                    relayer
                )
            )
        );
    }

    /// @notice Approve one exact milestone after the configured reviewer signs intent.
    /// @dev GrantVault still validates revocation, index, and duplicate approval.
    function approveMilestoneWithSignature(
        uint256 milestoneIndex,
        uint256 nonce,
        uint256 deadline,
        address relayer,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) revert SponsoredActionExpired();
        if (nonce != sponsoredReviewNonce) revert SponsoredActionNonceMismatch();
        if (relayer == address(0) || msg.sender != relayer) revert UnauthorizedRelayer();
        if (
            ECDSA.recover(hashSponsoredMilestoneApproval(milestoneIndex, nonce, deadline, relayer), signature)
                != reviewer
        ) revert SponsoredActionSignatureInvalid();

        sponsoredReviewNonce = nonce + 1;
        _approveMilestone(milestoneIndex, reviewer);
        emit SponsoredMilestoneApprovalExecuted(msg.sender, reviewer, milestoneIndex, nonce);
    }
}
