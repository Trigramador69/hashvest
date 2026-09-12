// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEligibilityProvider} from "./IEligibilityProvider.sol";

/// @notice Administrator-controlled demo allowlist. This is NOT KYC or compliance verification.
contract DemoEligibilityProvider is Ownable, IEligibilityProvider {
    mapping(address => bool) private eligible;

    event EligibilitySet(address indexed account, bool eligible);

    constructor(address administrator) Ownable(administrator) {}

    function setEligible(address account, bool value) external onlyOwner {
        eligible[account] = value;
        emit EligibilitySet(account, value);
    }

    function isEligible(address account) external view returns (bool) {
        return eligible[account];
    }
}
