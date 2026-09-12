// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GrantVault} from "../src/GrantVault.sol";
import {DemoEligibilityProvider} from "../src/DemoEligibilityProvider.sol";
import {GrantConfig, MilestoneInput, Milestone, UnlockStrategy} from "../src/GrantTypes.sol";

import {HashVestTestBase, FeeToken} from "./helpers/HashVestTestBase.sol";

contract HashVestTest is HashVestTestBase {
    function test_factoryCreatesFullyFundedTimeGrantAndRecordsRoles() public {
        GrantVault vault = createTime();
        assertEq(vault.title(), "Builder grant");
        assertEq(vault.issuer(), issuer);
        assertEq(vault.beneficiary(), beneficiary);
        assertEq(vault.reviewer(), address(0));
        assertEq(vault.token(), address(token));
        assertEq(vault.totalAllocation(), ALLOCATION);
        assertEq(uint256(vault.strategy()), uint256(UnlockStrategy.TIME));
        assertEq(token.balanceOf(address(vault)), ALLOCATION);
        assertEq(token.balanceOf(issuer), ALLOCATION * 9);
        assertEq(factory.getGrantsByIssuer(issuer)[0], address(vault));
        assertEq(factory.getGrantsByBeneficiary(beneficiary)[0], address(vault));
        assertEq(factory.getGrantsByReviewer(address(0)).length, 0);
    }

    function test_zeroBeneficiaryRejectedWithoutMovingFunds() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.beneficiary = address(0);
        vm.prank(issuer);
        vm.expectRevert();
        factory.createGrant(grant, new MilestoneInput[](0));
        assertEq(token.balanceOf(issuer), ALLOCATION * 10);
        assertEq(factory.getGrantsByIssuer(issuer).length, 0);
    }

    function test_timeCliffDelaysClaimsWithoutRestartingLinearCurve() public {
        GrantVault vault = createTime();
        vm.warp(START - 1);
        assertEq(vault.vestedByTime(), 0);
        vm.warp(START + 90 days - 1);
        assertEq(vault.vestedByTime(), 0);
        vm.warp(START + 90 days);
        assertEq(vault.vestedByTime(), 25_000 ether);
        assertEq(vault.unlockedAmount(), 25_000 ether);
        assertEq(vault.claimableAmount(), 25_000 ether);
        vm.warp(START + 180 days);
        assertEq(vault.vestedByTime(), 50_000 ether);
        vm.warp(START + DURATION);
        assertEq(vault.vestedByTime(), ALLOCATION);
        vm.warp(START + DURATION + 100 days);
        assertEq(vault.vestedByTime(), ALLOCATION);
    }

    function test_milestoneGrantUnlocksApprovedAmountsAndRecordsReviewer() public {
        GrantVault vault = createMilestoneGrant(UnlockStrategy.MILESTONE);
        assertEq(factory.getGrantsByReviewer(reviewer)[0], address(vault));
        assertEq(token.balanceOf(address(vault)), ALLOCATION);
        assertEq(vault.unlockedAmount(), 0);
        vm.prank(reviewer);
        vault.approveMilestone(0);
        assertEq(vault.milestoneUnlockedAmount(), 40_000 ether);
        assertEq(vault.unlockedAmount(), 40_000 ether);
        Milestone[] memory items = vault.getMilestones();
        assertEq(items[0].title, "Prototype");
        assertEq(items[0].amount, 40_000 ether);
        assertTrue(items[0].approved);
        assertFalse(items[1].approved);
        vm.prank(reviewer);
        vault.approveMilestone(1);
        assertEq(vault.unlockedAmount(), ALLOCATION);
        assertEq(vault.vestedByTime(), 0);
    }

    function test_hybridUnlocksMinimumOfTimeAndApprovedMilestones() public {
        GrantVault vault = createMilestoneGrant(UnlockStrategy.HYBRID);
        assertEq(token.balanceOf(address(vault)), ALLOCATION);
        assertEq(vault.unlockedAmount(), 0);
        vm.prank(reviewer);
        vault.approveMilestone(0);
        vm.warp(START + 90 days);
        assertEq(vault.vestedByTime(), 25_000 ether);
        assertEq(vault.milestoneUnlockedAmount(), 40_000 ether);
        assertEq(vault.unlockedAmount(), 25_000 ether);
        vm.warp(START + 216 days);
        assertEq(vault.vestedByTime(), 60_000 ether);
        assertEq(vault.unlockedAmount(), 40_000 ether);
        vm.warp(START + DURATION);
        assertEq(vault.unlockedAmount(), 40_000 ether);
        vm.prank(reviewer);
        vault.approveMilestone(1);
        assertEq(vault.unlockedAmount(), ALLOCATION);
    }

    function test_beneficiaryClaimsPartialThenRemainingAllocation() public {
        GrantVault vault = createTime();
        vm.warp(START + 90 days);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(vault.claimedAmount(), 25_000 ether);
        assertEq(vault.claimableAmount(), 0);
        assertEq(token.balanceOf(beneficiary), 25_000 ether);
        assertEq(token.balanceOf(address(vault)), 75_000 ether);
        vm.warp(START + DURATION);
        assertEq(vault.claimableAmount(), 75_000 ether);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(vault.claimedAmount(), ALLOCATION);
        assertEq(token.balanceOf(beneficiary), ALLOCATION);
        assertEq(token.balanceOf(address(vault)), 0);
        vm.prank(beneficiary);
        vm.expectRevert();
        vault.claim();
    }

    function test_eligibilityAdapterAllowsOnlyCurrentlyEligibleBeneficiary() public {
        DemoEligibilityProvider provider = new DemoEligibilityProvider(issuer);
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.eligibilityProvider = address(provider);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        vm.warp(START + 180 days);
        assertFalse(provider.isEligible(beneficiary));
        vm.prank(beneficiary);
        vm.expectRevert();
        vault.claim();
        assertEq(vault.claimedAmount(), 0);
        vm.prank(issuer);
        provider.setEligible(beneficiary, true);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 50_000 ether);
        vm.prank(issuer);
        provider.setEligible(beneficiary, false);
        vm.warp(START + DURATION);
        vm.prank(beneficiary);
        vm.expectRevert();
        vault.claim();
        assertEq(vault.claimedAmount(), 50_000 ether);
    }

    function test_invalidDurationRejected() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.duration = 0;
        vm.prank(issuer);
        vm.expectRevert();
        factory.createGrant(grant, new MilestoneInput[](0));
    }

    function test_incorrectMilestoneTotalRejected() public {
        MilestoneInput[] memory inputs = milestones();
        inputs[1].amount -= 1;
        vm.prank(issuer);
        vm.expectRevert();
        factory.createGrant(config(UnlockStrategy.MILESTONE), inputs);
    }

    function test_feeOnTransferFundingRevertsAtomically() public {
        FeeToken feeToken = new FeeToken();
        feeToken.mint(issuer, ALLOCATION);
        vm.prank(issuer);
        feeToken.approve(address(factory), ALLOCATION);
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.token = address(feeToken);
        vm.prank(issuer);
        vm.expectRevert();
        factory.createGrant(grant, new MilestoneInput[](0));
        assertEq(feeToken.balanceOf(issuer), ALLOCATION);
        assertEq(factory.getGrantsByIssuer(issuer).length, 0);
    }
}
