// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashVestTestBase} from "./helpers/HashVestTestBase.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";

contract InitialUnlockTest is HashVestTestBase {
    uint256 constant TEN_PERCENT = 10_000 ether;
    uint256 constant NINETY_PERCENT = 90_000 ether;
    uint256 constant CLIFF = 90 days; // 3 months

    function configWithInitial(UnlockStrategy strategy, uint256 initialUnlock)
        internal
        view
        returns (GrantConfig memory)
    {
        return GrantConfig({
            title: "TGE Grant",
            token: address(token),
            beneficiary: beneficiary,
            reviewer: strategy == UnlockStrategy.TIME ? address(0) : reviewer,
            totalAllocation: ALLOCATION,
            strategy: strategy,
            start: START,
            cliff: CLIFF,
            duration: DURATION,
            eligibilityProvider: address(0),
            initialUnlock: initialUnlock
        });
    }

    function test_mandatorySemanticExample_TIME() public {
        // Allocation: 100,000; Initial unlock: 10% (10,000); Cliff: 3 months (90 days); Duration: 12 months (360 days)
        GrantConfig memory grant = configWithInitial(UnlockStrategy.TIME, TEN_PERCENT);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));

        assertEq(vault.initialUnlock(), TEN_PERCENT);
        assertEq(vault.totalAllocation(), ALLOCATION);

        // Before start: nothing unlocked
        vm.warp(START - 1);
        assertEq(vault.vestedByTime(), 0);
        assertEq(vault.unlockedAmount(), 0);
        assertEq(vault.claimableAmount(), 0);

        // At start: exactly 10,000 initial unlock is available
        vm.warp(START);
        assertEq(vault.vestedByTime(), TEN_PERCENT);
        assertEq(vault.unlockedAmount(), TEN_PERCENT);
        assertEq(vault.claimableAmount(), TEN_PERCENT);

        // During cliff (e.g. 1 month in = 30 days): still only initial unlock
        vm.warp(START + 30 days);
        assertEq(vault.vestedByTime(), TEN_PERCENT);
        assertEq(vault.unlockedAmount(), TEN_PERCENT);

        // Exactly at cliff (90 days): cliff expires!
        // Vested = 10,000 + (90,000 * 90 / 360) = 10,000 + 22,500 = 32,500
        vm.warp(START + 90 days);
        assertEq(vault.vestedByTime(), 32_500 ether);
        assertEq(vault.unlockedAmount(), 32_500 ether);

        // Halfway through total duration (180 days):
        // Vested = 10,000 + (90,000 * 180 / 360) = 10,000 + 45,000 = 55,000
        vm.warp(START + 180 days);
        assertEq(vault.vestedByTime(), 55_000 ether);
        assertEq(vault.unlockedAmount(), 55_000 ether);

        // Three quarters through (270 days):
        // Vested = 10,000 + (90,000 * 270 / 360) = 10,000 + 67,500 = 77,500
        vm.warp(START + 270 days);
        assertEq(vault.vestedByTime(), 77_500 ether);
        assertEq(vault.unlockedAmount(), 77_500 ether);

        // At end of duration (360 days): exactly 100% unlocked
        vm.warp(START + 360 days);
        assertEq(vault.vestedByTime(), ALLOCATION);
        assertEq(vault.unlockedAmount(), ALLOCATION);

        // Far into the future: capped at 100%
        vm.warp(START + 1000 days);
        assertEq(vault.vestedByTime(), ALLOCATION);
        assertEq(vault.unlockedAmount(), ALLOCATION);
    }

    function test_repeatedClaimsWithInitialUnlock() public {
        GrantConfig memory grant = configWithInitial(UnlockStrategy.TIME, TEN_PERCENT);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));

        // 1. Claim initial unlock at start
        vm.warp(START);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), TEN_PERCENT);
        assertEq(vault.claimedAmount(), TEN_PERCENT);
        assertEq(vault.claimableAmount(), 0);

        // 2. Cannot claim again during cliff
        vm.warp(START + 45 days);
        assertEq(vault.claimableAmount(), 0);
        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.NothingToClaim.selector);
        vault.claim();

        // 3. Claim at midpoint (180 days):
        // Unlocked is 55,000. Claimed was 10,000. Claimable is 45,000.
        vm.warp(START + 180 days);
        assertEq(vault.claimableAmount(), 45_000 ether);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 55_000 ether);
        assertEq(vault.claimedAmount(), 55_000 ether);
        assertEq(vault.claimableAmount(), 0);

        // 4. Claim remaining at duration end (360 days):
        // Unlocked is 100,000. Claimed was 55,000. Claimable is 45,000.
        vm.warp(START + 360 days);
        assertEq(vault.claimableAmount(), 45_000 ether);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), ALLOCATION);
        assertEq(vault.claimedAmount(), ALLOCATION);
        assertEq(vault.claimableAmount(), 0);
        assertEq(token.balanceOf(address(vault)), 0);
    }

    function test_pureMilestoneStrategyRejectsInitialUnlock() public {
        GrantConfig memory grant = configWithInitial(UnlockStrategy.MILESTONE, TEN_PERCENT);
        MilestoneInput[] memory inputs = new MilestoneInput[](1);
        inputs[0] = MilestoneInput("Milestone", ALLOCATION);

        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidInitialUnlock.selector);
        factory.createGrant(grant, inputs);
    }

    function test_initialUnlockExceedingAllocationRejected() public {
        GrantConfig memory grant = configWithInitial(UnlockStrategy.TIME, ALLOCATION + 1);
        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidInitialUnlock.selector);
        factory.createGrant(grant, new MilestoneInput[](0));
    }

    function test_fullAllocationInitialUnlock_TIME() public {
        // 100% initial unlock: all tokens unlocked at start
        GrantConfig memory grant = configWithInitial(UnlockStrategy.TIME, ALLOCATION);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));

        vm.warp(START);
        assertEq(vault.unlockedAmount(), ALLOCATION);
        assertEq(vault.claimableAmount(), ALLOCATION);

        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), ALLOCATION);
    }

    function test_HYBRID_withInitialUnlockAndMilestones() public {
        // Allocation: 100,000; Initial unlock: 10,000.
        // Remaining 90,000 partitioned into 2 milestones: 45,000 each.
        GrantConfig memory grant = configWithInitial(UnlockStrategy.HYBRID, TEN_PERCENT);
        MilestoneInput[] memory inputs = new MilestoneInput[](2);
        inputs[0] = MilestoneInput("Milestone 1", 45_000 ether);
        inputs[1] = MilestoneInput("Milestone 2", 45_000 ether);

        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, inputs));

        // At start: initial unlock (10,000) is claimable without milestone approval!
        vm.warp(START);
        assertEq(vault.unlockedAmount(), TEN_PERCENT);
        assertEq(vault.claimableAmount(), TEN_PERCENT);

        vm.prank(beneficiary);
        vault.claim();
        assertEq(vault.claimedAmount(), TEN_PERCENT);
        assertEq(vault.claimableAmount(), 0);

        // During cliff: reviewer approves Milestone 1 (45,000).
        // Time remaining vesting is still 0 (cliff active).
        // unlocked = 10,000 + min(0, 45,000) = 10,000.
        vm.warp(START + 30 days);
        vm.prank(reviewer);
        vault.approveMilestone(0);
        assertEq(vault.milestoneUnlockedAmount(), 45_000 ether);
        assertEq(vault.unlockedAmount(), TEN_PERCENT);
        assertEq(vault.claimableAmount(), 0);

        // After cliff at midpoint (180 days):
        // Time remaining vesting = 90,000 * 180 / 360 = 45,000.
        // Milestone unlocked = 45,000.
        // unlocked = 10,000 + min(45,000, 45,000) = 55,000.
        // Claimable = 55,000 - 10,000 = 45,000.
        vm.warp(START + 180 days);
        assertEq(vault.unlockedAmount(), 55_000 ether);
        assertEq(vault.claimableAmount(), 45_000 ether);

        vm.prank(beneficiary);
        vault.claim();
        assertEq(vault.claimedAmount(), 55_000 ether);

        // At duration end (360 days), Milestone 2 NOT yet approved:
        // Time remaining vesting = 90,000. Milestone unlocked = 45,000.
        // unlocked = 10,000 + min(90,000, 45,000) = 55,000.
        // Claimable = 0. Milestone constraints hold back the remaining tokens!
        vm.warp(START + 360 days);
        assertEq(vault.unlockedAmount(), 55_000 ether);
        assertEq(vault.claimableAmount(), 0);

        // Reviewer approves Milestone 2:
        vm.prank(reviewer);
        vault.approveMilestone(1);
        assertEq(vault.milestoneUnlockedAmount(), 90_000 ether);
        assertEq(vault.unlockedAmount(), ALLOCATION);
        assertEq(vault.claimableAmount(), 45_000 ether);

        vm.prank(beneficiary);
        vault.claim();
        assertEq(vault.claimedAmount(), ALLOCATION);
        assertEq(token.balanceOf(beneficiary), ALLOCATION);
        assertEq(token.balanceOf(address(vault)), 0);
    }

    function test_HYBRID_milestoneSumMustMatchRemainingAllocation() public {
        GrantConfig memory grant = configWithInitial(UnlockStrategy.HYBRID, TEN_PERCENT);

        // If milestones sum to ALLOCATION (100k) instead of remaining (90k), reject!
        MilestoneInput[] memory inputsOver = new MilestoneInput[](1);
        inputsOver[0] = MilestoneInput("M1", ALLOCATION);
        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidMilestones.selector);
        factory.createGrant(grant, inputsOver);

        // If milestones sum to less than remaining (e.g. 80k), reject!
        MilestoneInput[] memory inputsUnder = new MilestoneInput[](1);
        inputsUnder[0] = MilestoneInput("M1", 80_000 ether);
        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidMilestones.selector);
        factory.createGrant(grant, inputsUnder);
    }

    function test_HYBRID_initialUnlockEqualsAllocationRejected() public {
        // For HYBRID, initialUnlock == totalAllocation leaves 0 for milestones
        GrantConfig memory grant = configWithInitial(UnlockStrategy.HYBRID, ALLOCATION);
        MilestoneInput[] memory inputs = new MilestoneInput[](1);
        inputs[0] = MilestoneInput("M1", 0);
        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidInitialUnlock.selector);
        factory.createGrant(grant, inputs);
    }

    function test_boundary_zeroCliffWithInitialUnlock() public {
        GrantConfig memory grant = configWithInitial(UnlockStrategy.TIME, TEN_PERCENT);
        grant.cliff = 0; // zero cliff
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));

        // At start: 10,000 initial unlock
        vm.warp(START);
        assertEq(vault.unlockedAmount(), TEN_PERCENT);

        // Linear vesting begins immediately after start
        vm.warp(START + 180 days);
        assertEq(vault.unlockedAmount(), 55_000 ether);
    }

    function test_boundary_cliffEqualToDurationWithInitialUnlock() public {
        GrantConfig memory grant = configWithInitial(UnlockStrategy.TIME, TEN_PERCENT);
        grant.cliff = DURATION; // cliff equals duration
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));

        // During entire duration before DURATION: only initial unlock
        vm.warp(START + DURATION - 1);
        assertEq(vault.unlockedAmount(), TEN_PERCENT);

        // At DURATION: entire 100% unlocks at once
        vm.warp(START + DURATION);
        assertEq(vault.unlockedAmount(), ALLOCATION);
    }

    function testFuzz_monotonicityAndConservation(uint256 initialUnlockRatio, uint64 t1Offset, uint64 t2Offset) public {
        vm.assume(initialUnlockRatio <= 100);
        uint256 initialUnlock = (ALLOCATION * initialUnlockRatio) / 100;

        GrantConfig memory grant = configWithInitial(UnlockStrategy.TIME, initialUnlock);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));

        uint256 t1 = START + (t1Offset % (DURATION * 2));
        uint256 t2 = t1 + (t2Offset % DURATION);

        vm.warp(t1);
        uint256 u1 = vault.unlockedAmount();
        vm.warp(t2);
        uint256 u2 = vault.unlockedAmount();

        // 1. Monotonicity
        assertGe(u2, u1);

        // 2. Conservation
        assertLe(u2, ALLOCATION);

        // 3. Initial unlock guarantee for t >= START
        assertGe(u1, initialUnlock);
        assertGe(u2, initialUnlock);
    }
}
