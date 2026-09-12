// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {GrantVault} from "./GrantVault.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "./GrantTypes.sol";

/// @notice Deploys and atomically funds one immutable vault per grant.
contract HashVestFactory is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error UnderfundedGrant();

    mapping(address => address[]) private grantsByIssuer;
    mapping(address => address[]) private grantsByBeneficiary;
    mapping(address => address[]) private grantsByReviewer;

    event GrantCreated(
        address indexed vault,
        address indexed issuer,
        address indexed beneficiary,
        address reviewer,
        string title,
        UnlockStrategy strategy
    );

    function createGrant(GrantConfig memory config, MilestoneInput[] memory milestones)
        external
        nonReentrant
        returns (address vault)
    {
        if (config.start == 0) config.start = block.timestamp;
        vault = address(new GrantVault(msg.sender, config, milestones));
        IERC20 asset = IERC20(config.token);
        uint256 beforeBalance = asset.balanceOf(vault);
        asset.safeTransferFrom(msg.sender, vault, config.totalAllocation);
        uint256 afterBalance = asset.balanceOf(vault);
        if (afterBalance < beforeBalance || afterBalance - beforeBalance < config.totalAllocation) {
            revert UnderfundedGrant();
        }
        grantsByIssuer[msg.sender].push(vault);
        grantsByBeneficiary[config.beneficiary].push(vault);
        if (config.reviewer != address(0)) grantsByReviewer[config.reviewer].push(vault);
        emit GrantCreated(vault, msg.sender, config.beneficiary, config.reviewer, config.title, config.strategy);
    }

    function getGrantsByIssuer(address account) external view returns (address[] memory) {
        return grantsByIssuer[account];
    }

    function getGrantsByBeneficiary(address account) external view returns (address[] memory) {
        return grantsByBeneficiary[account];
    }

    function getGrantsByReviewer(address account) external view returns (address[] memory) {
        return grantsByReviewer[account];
    }
}
