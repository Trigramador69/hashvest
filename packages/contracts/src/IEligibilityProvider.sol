// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Adapter boundary for a future attestation or eligibility system.
interface IEligibilityProvider {
    function isEligible(address account) external view returns (bool);
}
