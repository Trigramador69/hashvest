// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashVestTestBase} from "./helpers/HashVestTestBase.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";
import {DemoEligibilityProvider} from "../src/DemoEligibilityProvider.sol";

contract RevocableTest is HashVestTestBase {
    // ---------------------------------------------------------------------
    // 1. Mandatory Semantic Example
    // ---------------------------------------------------------------------
    function test_mandatorySemanticExample() public {
        GrantConfig memory cfg = revocableConfig(UnlockStrategy.TIME);
        cfg.cliff = 0;
        cfg.duration = 100 days;
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(cfg, new MilestoneInput[](0)));

        assertTrue(vault.revocable());
        assertFalse(vault.revoked());

        // Warp to 20 days: 20,000 tokens unlocked
        vm.warp(START + 20 days);
        assertEq(vault.unlockedAmount(), 20_000 ether);
        assertEq(vault.claimableAmount(), 20_000 ether);

        // Beneficiary claims 20,000 tokens
        vm.prank(beneficiary);
        vault.claim();
        assertEq(vault.claimedAmount(), 20_000 ether);
        assertEq(token.balanceOf(beneficiary), 20_000 ether);

        // Warp to 40 days: 40,000 tokens vested (20,000 newly unlocked)
        vm.warp(START + 40 days);
        assertEq(vault.unlockedAmount(), 40_000 ether);
        assertEq(vault.claimableAmount(), 20_000 ether);

        // Issuer revokes
        uint256 issuerBalanceBefore = token.balanceOf(issuer);
        vm.expectEmit(true, false, false, true, address(vault));
        emit GrantVault.GrantRevoked(issuer, 60_000 ether, 40_000 ether);
        vm.prank(issuer);
        vault.revoke();

        // Verification of Mandatory Semantic Example post-conditions:
        // 1. 20,000 already claimed remains with beneficiary
        assertEq(token.balanceOf(beneficiary), 20_000 ether);
        assertEq(vault.claimedAmount(), 20_000 ether);

        // 2. 20,000 earned but unclaimed remains claimable by beneficiary
        assertEq(vault.claimableAmount(), 20_000 ether);
        assertEq(vault.unlockedAmount(), 40_000 ether);
        assertEq(vault.revocationEarnedAmount(), 40_000 ether);

        // 3. 60,000 unearned returns to issuer
        assertEq(token.balanceOf(issuer) - issuerBalanceBefore, 60_000 ether);

        // 4. One-way state transition recorded
        assertTrue(vault.revoked());
        assertEq(vault.revokedAt(), START + 40 days);

        // Beneficiary claims remaining 20,000 earned entitlement
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 40_000 ether);
        assertEq(vault.claimedAmount(), 40_000 ether);
        assertEq(vault.claimableAmount(), 0);

        // Warp far into the future (e.g. 200 days): entitlement never exceeds 40,000
        vm.warp(START + 200 days);
        assertEq(vault.unlockedAmount(), 40_000 ether);
        assertEq(vault.claimableAmount(), 0);
        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.NothingToClaim.selector);
        vault.claim();
    }

    // ---------------------------------------------------------------------
    // 2. Normal Flows: TIME, MILESTONE, HYBRID
    // ---------------------------------------------------------------------
    function test_revocableTimeMidwayVesting() public {
        GrantVault vault = createRevocableTime(); // cliff 90 days, duration 360 days
        vm.warp(START + 180 days); // halfway: 50,000 ether
        assertEq(vault.unlockedAmount(), 50_000 ether);

        uint256 issuerBal = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();

        assertEq(token.balanceOf(issuer) - issuerBal, 50_000 ether);
        assertEq(vault.claimableAmount(), 50_000 ether);

        // Beneficiary claims
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 50_000 ether);

        // Vault is now empty of allocation tokens
        assertEq(token.balanceOf(address(vault)), 0);
    }

    function test_revocableMilestonePartialApproval() public {
        GrantVault vault = createRevocableMilestoneGrant(UnlockStrategy.MILESTONE);
        // Milestones: 0 -> 40k, 1 -> 60k
        vm.prank(reviewer);
        vault.approveMilestone(0);
        assertEq(vault.unlockedAmount(), 40_000 ether);

        uint256 issuerBal = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();

        // 60,000 returned to issuer
        assertEq(token.balanceOf(issuer) - issuerBal, 60_000 ether);
        assertEq(vault.claimableAmount(), 40_000 ether);

        // Reviewer cannot approve remaining milestone
        vm.prank(reviewer);
        vm.expectRevert(GrantVault.AlreadyRevoked.selector);
        vault.approveMilestone(1);

        // Beneficiary claims the 40k
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 40_000 ether);
    }

    function test_revocableHybridTimeLeading() public {
        GrantVault vault = createRevocableMilestoneGrant(UnlockStrategy.HYBRID);
        // Warp to 216 days (60% time = 60,000 ether)
        vm.warp(START + 216 days);
        // Approve milestone 0 (40,000 ether)
        vm.prank(reviewer);
        vault.approveMilestone(0);

        // In HYBRID: min(time 60k, milestone 40k) = 40,000 ether
        assertEq(vault.unlockedAmount(), 40_000 ether);

        uint256 issuerBal = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();

        // Issuer recovers 60,000 ether (100k - 40k)
        assertEq(token.balanceOf(issuer) - issuerBal, 60_000 ether);
        assertEq(vault.unlockedAmount(), 40_000 ether);
        assertEq(vault.claimableAmount(), 40_000 ether);

        // Beneficiary claims
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 40_000 ether);
    }

    function test_revocableHybridMilestoneLeading() public {
        GrantVault vault = createRevocableMilestoneGrant(UnlockStrategy.HYBRID);
        // Approve milestone 0 (40k) and milestone 1 (60k) -> approved milestones = 100k
        vm.prank(reviewer);
        vault.approveMilestone(0);
        vm.prank(reviewer);
        vault.approveMilestone(1);

        // Warp to 144 days (40% time = 40,000 ether)
        vm.warp(START + 144 days);

        // In HYBRID: min(time 40k, milestone 100k) = 40,000 ether
        assertEq(vault.unlockedAmount(), 40_000 ether);

        uint256 issuerBal = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();

        // Issuer recovers 60,000 ether
        assertEq(token.balanceOf(issuer) - issuerBal, 60_000 ether);
        assertEq(vault.unlockedAmount(), 40_000 ether);

        // Time advancing after revocation has zero effect
        vm.warp(START + 360 days);
        assertEq(vault.unlockedAmount(), 40_000 ether);
        assertEq(vault.claimableAmount(), 40_000 ether);

        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 40_000 ether);
    }

    // ---------------------------------------------------------------------
    // 3. Boundary Cases
    // ---------------------------------------------------------------------
    function test_revocationBeforeCliffRecovers100Percent() public {
        GrantVault vault = createRevocableTime();
        // Cliff is 90 days. Warp to 45 days.
        vm.warp(START + 45 days);
        assertEq(vault.unlockedAmount(), 0);

        uint256 issuerBal = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();

        // Issuer recovers entire 100,000 allocation
        assertEq(token.balanceOf(issuer) - issuerBal, ALLOCATION);
        assertEq(vault.unlockedAmount(), 0);
        assertEq(vault.claimableAmount(), 0);

        // Beneficiary cannot claim
        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.NothingToClaim.selector);
        vault.claim();
    }

    function test_revocationAfterFullVestingRecoversZero() public {
        GrantVault vault = createRevocableTime();
        // Warp past duration
        vm.warp(START + DURATION + 1 days);
        assertEq(vault.unlockedAmount(), ALLOCATION);

        uint256 issuerBal = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();

        // 0 recovered by issuer
        assertEq(token.balanceOf(issuer) - issuerBal, 0);
        assertEq(vault.unlockedAmount(), ALLOCATION);
        assertEq(vault.claimableAmount(), ALLOCATION);

        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), ALLOCATION);
    }

    function test_revocationWhenEntireEarnedAlreadyClaimed() public {
        GrantVault vault = createRevocableTime();
        vm.warp(START + 180 days); // 50k
        vm.prank(beneficiary);
        vault.claim(); // claims 50k

        assertEq(vault.claimedAmount(), 50_000 ether);
        assertEq(vault.claimableAmount(), 0);

        uint256 issuerBal = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();

        // Issuer gets remaining 50k
        assertEq(token.balanceOf(issuer) - issuerBal, 50_000 ether);
        assertEq(vault.claimableAmount(), 0);

        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.NothingToClaim.selector);
        vault.claim();
    }

    // ---------------------------------------------------------------------
    // 4. Repeated & One-Way State Transition
    // ---------------------------------------------------------------------
    function test_revokeTwiceRevertsAlreadyRevoked() public {
        GrantVault vault = createRevocableTime();
        vm.warp(START + 180 days);

        vm.prank(issuer);
        vault.revoke();
        assertTrue(vault.revoked());

        vm.prank(issuer);
        vm.expectRevert(GrantVault.AlreadyRevoked.selector);
        vault.revoke();
    }

    // ---------------------------------------------------------------------
    // 5. Authorization & Permissions
    // ---------------------------------------------------------------------
    function test_beneficiaryCannotRevoke() public {
        GrantVault vault = createRevocableTime();
        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.UnauthorizedIssuer.selector);
        vault.revoke();
    }

    function test_reviewerCannotRevoke() public {
        GrantVault vault = createRevocableMilestoneGrant(UnlockStrategy.MILESTONE);
        vm.prank(reviewer);
        vm.expectRevert(GrantVault.UnauthorizedIssuer.selector);
        vault.revoke();
    }

    function test_strangerCannotRevoke() public {
        GrantVault vault = createRevocableTime();
        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        vm.expectRevert(GrantVault.UnauthorizedIssuer.selector);
        vault.revoke();
    }

    // ---------------------------------------------------------------------
    // 6. Non-Revocable Grants Are Irreversible
    // ---------------------------------------------------------------------
    function test_nonRevocableGrantRejectsRevocation() public {
        GrantVault vault = createTime(); // revocable: false
        assertFalse(vault.revocable());

        vm.prank(issuer);
        vm.expectRevert(GrantVault.GrantNotRevocable.selector);
        vault.revoke();

        assertFalse(vault.revoked());

        // Continues to vest and function normally
        vm.warp(START + 180 days);
        assertEq(vault.claimableAmount(), 50_000 ether);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 50_000 ether);
    }

    // ---------------------------------------------------------------------
    // 7. Edge Cases: Surplus Tokens & Eligibility Adapter
    // ---------------------------------------------------------------------
    function test_surplusTokensInVaultPreservedAfterRevocation() public {
        GrantVault vault = createRevocableTime();
        // Send 50,000 surplus tokens directly to vault
        token.mint(address(vault), 50_000 ether);
        assertEq(token.balanceOf(address(vault)), 150_000 ether);

        vm.warp(START + 180 days); // 50k earned

        uint256 issuerBal = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();

        // Issuer recovers only 50k unearned allocation (totalAllocation 100k - earned 50k)
        assertEq(token.balanceOf(issuer) - issuerBal, 50_000 ether);
        // Vault preserves 50k claimable + 50k surplus = 100k
        assertEq(token.balanceOf(address(vault)), 100_000 ether);

        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 50_000 ether);
        // Surplus 50k remains in vault
        assertEq(token.balanceOf(address(vault)), 50_000 ether);
    }

    function test_eligibilityProviderRespectedPostRevocation() public {
        DemoEligibilityProvider provider = new DemoEligibilityProvider(issuer);
        GrantConfig memory cfg = revocableConfig(UnlockStrategy.TIME);
        cfg.cliff = 0;
        cfg.duration = 100 days;
        cfg.eligibilityProvider = address(provider);

        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(cfg, new MilestoneInput[](0)));

        vm.warp(START + 50 days);
        vm.prank(issuer);
        vault.revoke();

        // Beneficiary not yet marked eligible
        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.BeneficiaryNotEligible.selector);
        vault.claim();

        // Issuer marks eligible
        vm.prank(issuer);
        provider.setEligible(beneficiary, true);

        // Now claim succeeds
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 50_000 ether);
    }

    // ---------------------------------------------------------------------
    // 8. Invariant & Fuzz Tests
    // ---------------------------------------------------------------------
    function testFuzz_entitlementConservation(uint64 warpDelta) public {
        GrantVault vault = createRevocableTime();
        uint256 revTime = START + (uint256(warpDelta) % (DURATION * 2));
        vm.warp(revTime);

        uint256 issuerBefore = token.balanceOf(issuer);
        vm.prank(issuer);
        vault.revoke();
        uint256 recovered = token.balanceOf(issuer) - issuerBefore;

        uint256 claimed = vault.claimedAmount();
        uint256 claimable = vault.claimableAmount();

        // Conservation invariant: claimed + claimable + recovered == totalAllocation
        assertEq(claimed + claimable + recovered, ALLOCATION);
        assertEq(recovered, ALLOCATION - vault.revocationEarnedAmount());
    }

    function testFuzz_claimedPreservation(uint64 claimDelta, uint64 revokeDelta) public {
        GrantVault vault = createRevocableTime();
        uint256 t1 = START + 90 days + (uint256(claimDelta) % (DURATION - 90 days));
        vm.warp(t1);

        uint256 claimableAtT1 = vault.claimableAmount();
        if (claimableAtT1 > 0) {
            vm.prank(beneficiary);
            vault.claim();
        }
        uint256 beneficiaryBalanceAfterFirstClaim = token.balanceOf(beneficiary);
        assertEq(vault.claimedAmount(), beneficiaryBalanceAfterFirstClaim);

        // Warp to t2 (at or after t1)
        uint256 t2 = t1 + (uint256(revokeDelta) % (DURATION * 2));
        vm.warp(t2);

        vm.prank(issuer);
        vault.revoke();

        // Beneficiary balance must NEVER decrease upon revocation
        assertEq(token.balanceOf(beneficiary), beneficiaryBalanceAfterFirstClaim);

        // Any remaining claimable can still be claimed
        uint256 remainingClaimable = vault.claimableAmount();
        if (remainingClaimable > 0) {
            vm.prank(beneficiary);
            vault.claim();
        }

        assertEq(token.balanceOf(beneficiary), beneficiaryBalanceAfterFirstClaim + remainingClaimable);
        assertEq(vault.claimedAmount(), vault.revocationEarnedAmount());
    }

    function testFuzz_oneWayStateTransition(uint64 warpDelta) public {
        GrantVault vault = createRevocableTime();
        uint256 revTime = START + (uint256(warpDelta) % (DURATION * 2));
        vm.warp(revTime);

        vm.prank(issuer);
        vault.revoke();

        assertTrue(vault.revoked());
        uint256 frozenEarned = vault.revocationEarnedAmount();

        // Time moving forward does not change earned amount
        vm.warp(revTime + 1000 days);
        assertEq(vault.unlockedAmount(), frozenEarned);

        // Calling revoke again must revert
        vm.prank(issuer);
        vm.expectRevert(GrantVault.AlreadyRevoked.selector);
        vault.revoke();
    }
}
