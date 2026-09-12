// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashVestTestBase, TestToken} from "./helpers/HashVestTestBase.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";

contract FuzzTest is HashVestTestBase {
    function testFuzz_timeClaimsStayMonotonicAndConserveAllocation(
        uint128 amountSeed,
        uint64 durationSeed,
        uint64 cliffSeed,
        uint64 firstTimeSeed,
        uint64 secondTimeSeed
    ) public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.totalAllocation = bound(amountSeed, 1, type(uint128).max);
        grant.duration = bound(durationSeed, 1, 3650 days);
        grant.cliff = bound(cliffSeed, 0, grant.duration);
        token.mint(issuer, grant.totalAllocation);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));

        uint256 firstTime = bound(firstTimeSeed, 0, grant.duration * 2);
        uint256 secondTime = bound(secondTimeSeed, firstTime, grant.duration * 2);
        vm.warp(START + firstTime);
        uint256 firstUnlocked = vault.unlockedAmount();
        assertLe(firstUnlocked, grant.totalAllocation);
        if (firstUnlocked > 0) {
            vm.prank(beneficiary);
            vault.claim();
        }
        assertEq(vault.claimableAmount(), 0);

        vm.warp(START + secondTime);
        uint256 secondUnlocked = vault.unlockedAmount();
        assertGe(secondUnlocked, firstUnlocked);
        assertLe(secondUnlocked, grant.totalAllocation);
        if (vault.claimableAmount() > 0) {
            vm.prank(beneficiary);
            vault.claim();
        }
        assertEq(vault.claimedAmount(), secondUnlocked);
        assertEq(token.balanceOf(beneficiary) + token.balanceOf(address(vault)), grant.totalAllocation);

        vm.warp(START + grant.duration * 2 + 1);
        if (vault.claimableAmount() > 0) {
            vm.prank(beneficiary);
            vault.claim();
        }
        assertEq(vault.claimedAmount(), grant.totalAllocation);
        assertEq(token.balanceOf(beneficiary), grant.totalAllocation);
        assertEq(token.balanceOf(address(vault)), 0);
    }

    function testFuzz_hybridRespectsBothCapsAndEventuallyPaysExactAllocation(
        uint128 amountSeed,
        uint128 milestoneSeed,
        uint64 elapsedSeed
    ) public {
        GrantConfig memory grant = config(UnlockStrategy.HYBRID);
        grant.totalAllocation = bound(amountSeed, 2, type(uint128).max);
        grant.cliff = 0;
        uint256 firstMilestone = bound(milestoneSeed, 1, grant.totalAllocation - 1);
        MilestoneInput[] memory inputs = new MilestoneInput[](2);
        inputs[0] = MilestoneInput("First", firstMilestone);
        inputs[1] = MilestoneInput("Final", grant.totalAllocation - firstMilestone);
        token.mint(issuer, grant.totalAllocation);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, inputs));
        vm.prank(reviewer);
        vault.approveMilestone(0);
        vm.warp(START + bound(elapsedSeed, 0, DURATION * 2));
        assertLe(vault.unlockedAmount(), vault.vestedByTime());
        assertLe(vault.unlockedAmount(), firstMilestone);
        if (vault.claimableAmount() > 0) {
            vm.prank(beneficiary);
            vault.claim();
        }
        vm.prank(reviewer);
        vault.approveMilestone(1);
        vm.warp(START + DURATION * 2 + 1);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(vault.claimedAmount(), grant.totalAllocation);
        assertEq(token.balanceOf(beneficiary), grant.totalAllocation);
        assertEq(vault.claimableAmount(), 0);
    }

    function testFuzz_fullWidthAllocationDoesNotOverflowLinearMath(uint256 amountSeed) public {
        TestToken largeToken = new TestToken();
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.totalAllocation = bound(amountSeed, uint256(type(uint128).max) + 1, type(uint256).max);
        grant.token = address(largeToken);
        largeToken.mint(issuer, grant.totalAllocation);
        vm.prank(issuer);
        largeToken.approve(address(factory), grant.totalAllocation);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        vm.warp(START + DURATION / 2);
        assertEq(vault.vestedByTime(), grant.totalAllocation / 2);
        vm.prank(beneficiary);
        vault.claim();
        vm.warp(START + DURATION);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(largeToken.balanceOf(beneficiary), grant.totalAllocation);
        assertEq(vault.claimedAmount(), grant.totalAllocation);
    }

    function testFuzz_incorrectMilestoneSumAlwaysRejected(uint128 allocationSeed, uint128 milestoneSeed) public {
        GrantConfig memory grant = config(UnlockStrategy.MILESTONE);
        grant.totalAllocation = bound(allocationSeed, 1, type(uint128).max);
        uint256 wrongAmount = bound(milestoneSeed, 1, type(uint128).max);
        if (wrongAmount == grant.totalAllocation) ++wrongAmount;
        MilestoneInput[] memory inputs = new MilestoneInput[](1);
        inputs[0] = MilestoneInput("Incorrect", wrongAmount);
        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidMilestones.selector);
        factory.createGrant(grant, inputs);
    }
}
