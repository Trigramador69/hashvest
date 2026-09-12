// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashVestTestBase, TestToken} from "./helpers/HashVestTestBase.sol";
import {HashVestFactory} from "../src/HashVestFactory.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";

contract SixDecimalToken is TestToken {
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract LifecycleTest is HashVestTestBase {
    function test_revocableCreationEventIdentifiesMode() public {
        GrantConfig memory grant = revocableConfig(UnlockStrategy.HYBRID);
        address predictedVault = vm.computeCreateAddress(address(factory), vm.getNonce(address(factory)));
        vm.expectEmit(true, true, true, true, address(factory));
        emit HashVestFactory.GrantCreated(
            predictedVault, issuer, beneficiary, reviewer, grant.title, grant.strategy, true
        );

        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, milestones()));
        assertTrue(vault.revocable());
    }

    function test_threeWalletHybridLifecycleEmitsEventsAndSettlesExactly() public {
        address predictedVault = vm.computeCreateAddress(address(factory), vm.getNonce(address(factory)));
        vm.expectEmit(true, true, true, true, address(factory));
        emit HashVestFactory.GrantCreated(
            predictedVault, issuer, beneficiary, reviewer, "Builder grant", UnlockStrategy.HYBRID, false
        );
        GrantVault vault = createMilestoneGrant(UnlockStrategy.HYBRID);
        assertEq(address(vault), predictedVault);
        assertEq(token.balanceOf(address(vault)), ALLOCATION);
        assertEq(factory.getGrantsByIssuer(issuer)[0], predictedVault);
        assertEq(factory.getGrantsByBeneficiary(beneficiary)[0], predictedVault);
        assertEq(factory.getGrantsByReviewer(reviewer)[0], predictedVault);

        vm.warp(START + 216 days);
        assertEq(vault.vestedByTime(), 60_000 ether);
        assertEq(vault.claimableAmount(), 0);
        vm.expectEmit(true, true, false, true, address(vault));
        emit GrantVault.MilestoneApproved(reviewer, 0, 40_000 ether);
        vm.prank(reviewer);
        vault.approveMilestone(0);
        assertEq(vault.claimableAmount(), 40_000 ether);
        vm.expectEmit(true, true, false, true, address(vault));
        emit GrantVault.TokensClaimed(beneficiary, address(token), 40_000 ether, 40_000 ether);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 40_000 ether);
        assertEq(vault.claimableAmount(), 0);

        vm.prank(reviewer);
        vault.approveMilestone(1);
        assertEq(vault.claimableAmount(), 20_000 ether);
        vm.prank(beneficiary);
        vault.claim();
        vm.warp(START + DURATION);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), ALLOCATION);
        assertEq(token.balanceOf(address(vault)), 0);
        assertEq(vault.claimedAmount(), ALLOCATION);
        assertEq(vault.claimableAmount(), 0);
    }

    function test_milestoneOnlyClaimsAreIndependentOfTime() public {
        GrantConfig memory grant = config(UnlockStrategy.MILESTONE);
        grant.start = START + 10 * DURATION;
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, milestones()));
        vm.prank(reviewer);
        vault.approveMilestone(1);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 60_000 ether);
        vm.prank(reviewer);
        vault.approveMilestone(0);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), ALLOCATION);
        assertEq(vault.claimedAmount(), ALLOCATION);
    }

    function test_multipleGrantsRemainIsolatedAndDiscoverable() public {
        GrantVault timeVault = createTime();
        GrantVault hybridVault = createMilestoneGrant(UnlockStrategy.HYBRID);
        GrantVault milestoneVault = createMilestoneGrant(UnlockStrategy.MILESTONE);
        address[] memory issued = factory.getGrantsByIssuer(issuer);
        assertEq(issued.length, 3);
        assertEq(issued[0], address(timeVault));
        assertEq(issued[1], address(hybridVault));
        assertEq(issued[2], address(milestoneVault));
        assertEq(factory.getGrantsByBeneficiary(beneficiary).length, 3);
        assertEq(factory.getGrantsByReviewer(reviewer).length, 2);
        vm.prank(reviewer);
        milestoneVault.approveMilestone(0);
        vm.prank(beneficiary);
        milestoneVault.claim();
        assertEq(token.balanceOf(address(timeVault)), ALLOCATION);
        assertEq(token.balanceOf(address(hybridVault)), ALLOCATION);
        assertEq(token.balanceOf(address(milestoneVault)), 60_000 ether);
        assertEq(hybridVault.milestoneUnlockedAmount(), 0);
    }

    function test_non18DecimalTokenUsesRawAllocationUnits() public {
        // Token decimals are presentation metadata; the protocol stores and transfers exact base units.
        SixDecimalToken sixDecimalToken = new SixDecimalToken();
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.totalAllocation = 100_000 * 1e6;
        grant.token = address(sixDecimalToken);
        sixDecimalToken.mint(issuer, grant.totalAllocation);
        vm.prank(issuer);
        sixDecimalToken.approve(address(factory), grant.totalAllocation);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        vm.warp(START + DURATION / 2);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(sixDecimalToken.decimals(), 6);
        assertEq(sixDecimalToken.balanceOf(beneficiary), 50_000 * 1e6);
    }
}
