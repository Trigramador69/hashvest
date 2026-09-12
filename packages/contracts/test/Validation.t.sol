// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashVestTestBase} from "./helpers/HashVestTestBase.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";

contract ValidationTest is HashVestTestBase {
    function reject(GrantConfig memory grant, MilestoneInput[] memory inputs, bytes4 reason) internal {
        vm.prank(issuer);
        vm.expectRevert(reason);
        factory.createGrant(grant, inputs);
    }

    function test_zeroTokenRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.token = address(0);
        reject(grant, new MilestoneInput[](0), GrantVault.InvalidAddress.selector);
    }

    function test_eoaTokenRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.token = beneficiary;
        reject(grant, new MilestoneInput[](0), GrantVault.InvalidAddress.selector);
    }

    function test_eoaEligibilityProviderRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.eligibilityProvider = beneficiary;
        reject(grant, new MilestoneInput[](0), GrantVault.InvalidAddress.selector);
    }

    function test_zeroAllocationRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.totalAllocation = 0;
        reject(grant, new MilestoneInput[](0), GrantVault.InvalidAllocation.selector);
    }

    function test_cliffLongerThanDurationRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.cliff = grant.duration + 1;
        reject(grant, new MilestoneInput[](0), GrantVault.InvalidSchedule.selector);
    }

    function test_hybridRequiresValidDuration() public {
        GrantConfig memory grant = config(UnlockStrategy.HYBRID);
        grant.duration = 0;
        reject(grant, milestones(), GrantVault.InvalidSchedule.selector);
    }

    function test_overflowingEndTimestampRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.start = type(uint256).max - DURATION + 1;
        reject(grant, new MilestoneInput[](0), GrantVault.InvalidSchedule.selector);
    }

    function test_milestoneWithoutReviewerRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.MILESTONE);
        grant.reviewer = address(0);
        reject(grant, milestones(), GrantVault.InvalidAddress.selector);
    }

    function test_hybridWithoutReviewerRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.HYBRID);
        grant.reviewer = address(0);
        reject(grant, milestones(), GrantVault.InvalidAddress.selector);
    }

    function test_milestoneWithoutMilestonesRejected() public {
        reject(config(UnlockStrategy.MILESTONE), new MilestoneInput[](0), GrantVault.InvalidMilestones.selector);
    }

    function test_zeroValueMilestoneRejected() public {
        MilestoneInput[] memory inputs = milestones();
        inputs[0].amount = 0;
        inputs[1].amount = ALLOCATION;
        reject(config(UnlockStrategy.MILESTONE), inputs, GrantVault.InvalidMilestones.selector);
    }

    function test_tooManyMilestonesRejected() public {
        MilestoneInput[] memory inputs = new MilestoneInput[](21);
        for (uint256 i; i < 20; ++i) {
            inputs[i] = MilestoneInput("Step", 1 ether);
        }
        inputs[20] = MilestoneInput("Final", ALLOCATION - 20 ether);
        reject(config(UnlockStrategy.HYBRID), inputs, GrantVault.InvalidMilestones.selector);
    }

    function test_twentyMilestonesAccepted() public {
        MilestoneInput[] memory inputs = new MilestoneInput[](20);
        for (uint256 i; i < 20; ++i) {
            inputs[i] = MilestoneInput("Step", 5_000 ether);
        }
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(config(UnlockStrategy.MILESTONE), inputs));
        assertEq(vault.getMilestones().length, 20);
    }

    function test_timeWithMilestonesRejected() public {
        reject(config(UnlockStrategy.TIME), milestones(), GrantVault.InvalidMilestones.selector);
    }

    function test_milestoneSumAboveAllocationRejected() public {
        MilestoneInput[] memory inputs = milestones();
        inputs[1].amount += 1;
        reject(config(UnlockStrategy.HYBRID), inputs, GrantVault.InvalidMilestones.selector);
    }

    function test_overflowingMilestoneSumRejected() public {
        MilestoneInput[] memory inputs = milestones();
        inputs[0].amount = type(uint256).max;
        inputs[1].amount = 1;
        reject(config(UnlockStrategy.MILESTONE), inputs, GrantVault.InvalidMilestones.selector);
    }

    function test_milestoneOnlyDoesNotRequireValidTimeSchedule() public {
        GrantConfig memory grant = config(UnlockStrategy.MILESTONE);
        grant.duration = 0;
        grant.cliff = type(uint256).max;
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, milestones()));
        vm.prank(reviewer);
        vault.approveMilestone(0);
        assertEq(vault.unlockedAmount(), 40_000 ether);
    }

    function test_zeroStartNormalizesToCreationTimestamp() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.start = 0;
        vm.warp(START + 1 days);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        assertEq(vault.start(), START + 1 days);
    }

    function test_cliffEqualToDurationUnlocksAllAtEnd() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.cliff = DURATION;
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        vm.warp(START + DURATION - 1);
        assertEq(vault.unlockedAmount(), 0);
        vm.warp(START + DURATION);
        assertEq(vault.unlockedAmount(), ALLOCATION);
    }

    function test_zeroCliffDoesNotUnlockBeforeStart() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.cliff = 0;
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        vm.warp(START - 1);
        assertEq(vault.unlockedAmount(), 0);
        vm.warp(START);
        assertEq(vault.unlockedAmount(), 0);
        vm.warp(START + DURATION / 2);
        assertEq(vault.unlockedAmount(), 50_000 ether);
    }
}
