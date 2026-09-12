// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Deployment and ABI smoke-test contract with no product behavior.
contract DevelopmentRegistry {
    function version() external pure returns (string memory) {
        return "0.1.0";
    }
}
