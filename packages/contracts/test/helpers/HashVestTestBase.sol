// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {HashVestFactory} from "../../src/HashVestFactory.sol";
import {GrantVault} from "../../src/GrantVault.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "../../src/GrantTypes.sol";

contract TestToken is ERC20 {
    constructor() ERC20("Test USD", "TEST") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}

contract FeeToken is TestToken {
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = value / 100;
            super._update(from, address(0), fee);
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}

abstract contract HashVestTestBase is Test {
    HashVestFactory internal factory;
    TestToken internal token;
    address internal issuer = makeAddr("issuer");
    address internal beneficiary = makeAddr("beneficiary");
    address internal reviewer = makeAddr("reviewer");
    uint256 internal constant ALLOCATION = 100_000 ether;
    uint256 internal constant START = 1_000_000;
    uint256 internal constant DURATION = 360 days;

    function setUp() public {
        vm.warp(START);
        factory = new HashVestFactory();
        token = new TestToken();
        token.mint(issuer, ALLOCATION * 10);
        vm.prank(issuer);
        token.approve(address(factory), type(uint256).max);
    }

    function config(UnlockStrategy strategy) internal view returns (GrantConfig memory) {
        return GrantConfig({
            title: "Builder grant",
            token: address(token),
            beneficiary: beneficiary,
            reviewer: strategy == UnlockStrategy.TIME ? address(0) : reviewer,
            totalAllocation: ALLOCATION,
            strategy: strategy,
            start: START,
            cliff: 90 days,
            duration: DURATION,
            eligibilityProvider: address(0)
        });
    }

    function createTime() internal returns (GrantVault) {
        vm.prank(issuer);
        return GrantVault(factory.createGrant(config(UnlockStrategy.TIME), new MilestoneInput[](0)));
    }

    function milestones() internal pure returns (MilestoneInput[] memory inputs) {
        inputs = new MilestoneInput[](2);
        inputs[0] = MilestoneInput("Prototype", 40_000 ether);
        inputs[1] = MilestoneInput("Launch", 60_000 ether);
    }

    function createMilestoneGrant(UnlockStrategy strategy) internal returns (GrantVault) {
        vm.prank(issuer);
        return GrantVault(factory.createGrant(config(strategy), milestones()));
    }
}
