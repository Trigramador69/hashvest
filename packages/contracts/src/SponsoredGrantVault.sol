// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import {GrantVault} from "./GrantVault.sol";
import {GrantConfig, MilestoneInput} from "./GrantTypes.sol";

/// @notice Versioned GrantVault extension for one beneficiary-authorized,
/// relayer-submitted first claim. Existing GrantVaults remain unchanged.
contract SponsoredGrantVault is GrantVault, EIP712 {
    using ECDSA for bytes32;

    error SponsoredClaimAlreadyUsed();
    error SponsoredClaimExpired();
    error SponsoredClaimNonceMismatch();
    error SponsoredClaimAmountUnavailable();
    error SponsoredClaimSignatureInvalid();
    error UnauthorizedRelayer();

    bytes32 public constant SPONSORED_CLAIM_TYPEHASH = keccak256(
        "SponsoredClaim(address vault,address beneficiary,uint256 amount,uint256 nonce,uint256 deadline,address relayer)"
    );

    uint256 public sponsoredClaimNonce;
    bool public sponsoredClaimUsed;

    event SponsoredClaimExecuted(
        address indexed relayer, address indexed beneficiary, uint256 amount, uint256 indexed nonce
    );

    constructor(address issuer_, GrantConfig memory config, MilestoneInput[] memory inputs)
        GrantVault(issuer_, config, inputs)
        EIP712("HashVest Sponsored Claim", "1")
    {}

    /// @notice Marker used by Cloud to distinguish this version from legacy vaults.
    function supportsSponsoredClaims() external pure returns (bool) {
        return true;
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

    /// @notice Settle one exact first claim after the beneficiary signs intent.
    /// @dev The relayer is part of the signed payload and must submit the call.
    function claimWithSignature(
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        address relayer,
        bytes calldata signature
    ) external nonReentrant {
        if (sponsoredClaimUsed || claimedAmount != 0) revert SponsoredClaimAlreadyUsed();
        if (block.timestamp > deadline) revert SponsoredClaimExpired();
        if (nonce != sponsoredClaimNonce) revert SponsoredClaimNonceMismatch();
        if (relayer == address(0) || msg.sender != relayer) revert UnauthorizedRelayer();
        if (amount == 0 || amount > claimableAmount()) revert SponsoredClaimAmountUnavailable();
        if (hashSponsoredClaim(amount, nonce, deadline, relayer).recover(signature) != beneficiary) {
            revert SponsoredClaimSignatureInvalid();
        }

        sponsoredClaimUsed = true;
        sponsoredClaimNonce = nonce + 1;
        _claim(amount);
        emit SponsoredClaimExecuted(msg.sender, beneficiary, amount, nonce);
    }
}
