// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {SponsoredGrantVault} from "../src/SponsoredGrantVault.sol";

import {HashVestTestBase} from "./helpers/HashVestTestBase.sol";

contract SponsoredClaimTest is HashVestTestBase {
    uint256 private constant BENEFICIARY_PRIVATE_KEY = 0xA11CE;
    uint256 private constant REVIEWER_PRIVATE_KEY = 0xB0B;
    address private relayer = makeAddr("sponsored relayer");

    function sponsoredConfig(UnlockStrategy strategy) internal view returns (GrantConfig memory grant) {
        grant = config(strategy);
        grant.beneficiary = vm.addr(BENEFICIARY_PRIVATE_KEY);
        if (strategy != UnlockStrategy.TIME) grant.reviewer = vm.addr(REVIEWER_PRIVATE_KEY);
    }

    function createSponsoredTime() internal returns (SponsoredGrantVault vault) {
        vm.prank(issuer);
        vault = SponsoredGrantVault(
            factory.createSponsoredGrant(sponsoredConfig(UnlockStrategy.TIME), new MilestoneInput[](0))
        );
    }

    function createSponsoredMilestone() internal returns (SponsoredGrantVault vault) {
        vm.prank(issuer);
        vault =
            SponsoredGrantVault(factory.createSponsoredGrant(sponsoredConfig(UnlockStrategy.MILESTONE), milestones()));
    }

    function createSponsoredRevocableMilestone() internal returns (SponsoredGrantVault vault) {
        GrantConfig memory grant = sponsoredConfig(UnlockStrategy.MILESTONE);
        grant.revocable = true;
        vm.prank(issuer);
        vault = SponsoredGrantVault(factory.createSponsoredGrant(grant, milestones()));
    }

    function createSponsoredHybrid() internal returns (SponsoredGrantVault vault) {
        vm.prank(issuer);
        vault = SponsoredGrantVault(factory.createSponsoredGrant(sponsoredConfig(UnlockStrategy.HYBRID), milestones()));
    }

    function signClaim(SponsoredGrantVault vault, uint256 amount, uint256 nonce, uint256 deadline, address sender)
        internal
        view
        returns (bytes memory signature)
    {
        bytes32 digest = vault.hashSponsoredClaim(amount, nonce, deadline, sender);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(BENEFICIARY_PRIVATE_KEY, digest);
        return abi.encodePacked(r, s, v);
    }

    function signReview(SponsoredGrantVault vault, uint256 index, uint256 nonce, uint256 deadline, address sender)
        internal
        view
        returns (bytes memory signature)
    {
        bytes32 digest = vault.hashSponsoredMilestoneApproval(index, nonce, deadline, sender);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(REVIEWER_PRIVATE_KEY, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_sponsoredClaimsBindIntentAndSupportLaterClaims() public {
        SponsoredGrantVault vault = createSponsoredTime();
        vm.warp(START + 90 days);
        uint256 deadline = START + 180 days;
        bytes memory first = signClaim(vault, 10_000 ether, 0, deadline, relayer);
        bytes memory second = signClaim(vault, 5_000 ether, 1, deadline, relayer);

        vm.prank(relayer);
        vault.claimWithSignature(10_000 ether, 0, deadline, relayer, first);
        vm.prank(relayer);
        vault.claimWithSignature(5_000 ether, 1, deadline, relayer, second);

        assertEq(vault.claimedAmount(), 15_000 ether);
        assertEq(vault.sponsoredClaimNonce(), 2);
        assertEq(token.balanceOf(vm.addr(BENEFICIARY_PRIVATE_KEY)), 15_000 ether);
        assertEq(vault.claimableAmount(), 10_000 ether);
    }

    function test_sponsoredClaimRejectsReplayWrongRelayerSignatureExpiryAndAmount() public {
        SponsoredGrantVault vault = createSponsoredTime();
        vm.warp(START + 90 days);
        uint256 deadline = START + 180 days;
        bytes memory signature = signClaim(vault, 10_000 ether, 0, deadline, relayer);
        bytes memory tooMuch = signClaim(vault, 15_001 ether, 1, deadline, relayer);
        bytes memory expired = signClaim(vault, 1 ether, 1, deadline, relayer);
        address otherRelayer = makeAddr("other relayer");

        vm.prank(otherRelayer);
        vm.expectRevert(SponsoredGrantVault.UnauthorizedRelayer.selector);
        vault.claimWithSignature(10_000 ether, 0, deadline, relayer, signature);

        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredActionSignatureInvalid.selector);
        vault.claimWithSignature(9_000 ether, 0, deadline, relayer, signature);

        vm.prank(relayer);
        vault.claimWithSignature(10_000 ether, 0, deadline, relayer, signature);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredActionNonceMismatch.selector);
        vault.claimWithSignature(10_000 ether, 0, deadline, relayer, signature);

        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredActionAmountUnavailable.selector);
        vault.claimWithSignature(15_001 ether, 1, deadline, relayer, tooMuch);

        vm.warp(deadline + 1);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredActionExpired.selector);
        vault.claimWithSignature(1 ether, 1, deadline, relayer, expired);
    }

    function test_sponsoredReviewBindsReviewerMilestoneRelayerAndNonce() public {
        SponsoredGrantVault vault = createSponsoredMilestone();
        uint256 deadline = block.timestamp + 1 days;
        bytes memory first = signReview(vault, 0, 0, deadline, relayer);
        bytes memory second = signReview(vault, 1, 1, deadline, relayer);

        vm.prank(relayer);
        vault.approveMilestoneWithSignature(0, 0, deadline, relayer, first);
        assertEq(vault.sponsoredReviewNonce(), 1);
        assertEq(vault.milestoneUnlockedAmount(), 40_000 ether);

        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredActionNonceMismatch.selector);
        vault.approveMilestoneWithSignature(0, 0, deadline, relayer, first);

        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredActionSignatureInvalid.selector);
        vault.approveMilestoneWithSignature(1, 1, deadline, relayer, first);

        vm.prank(relayer);
        vault.approveMilestoneWithSignature(1, 1, deadline, relayer, second);
        assertEq(vault.milestoneUnlockedAmount(), 100_000 ether);
    }

    function test_manualClaimAndReviewRemainAvailable() public {
        SponsoredGrantVault timeVault = createSponsoredTime();
        vm.warp(START + 90 days);
        vm.prank(vm.addr(BENEFICIARY_PRIVATE_KEY));
        timeVault.claim();
        assertEq(timeVault.claimedAmount(), 25_000 ether);

        SponsoredGrantVault milestoneVault = createSponsoredMilestone();
        vm.prank(vm.addr(REVIEWER_PRIVATE_KEY));
        milestoneVault.approveMilestone(0);
        assertEq(milestoneVault.milestoneUnlockedAmount(), 40_000 ether);
    }

    function test_legacyVaultsDoNotExposeSponsoredActionSurface() public {
        GrantVault vault = createTime();
        (bool success,) = address(vault).call(abi.encodeWithSignature("supportsSponsoredActions()"));
        assertFalse(success);
    }

    function test_sponsoredReviewRejectsWrongRelayerExpiryAndRevocation() public {
        SponsoredGrantVault vault = createSponsoredRevocableMilestone();
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = signReview(vault, 0, 0, deadline, relayer);
        address otherRelayer = makeAddr("other relayer");

        vm.prank(otherRelayer);
        vm.expectRevert(SponsoredGrantVault.UnauthorizedRelayer.selector);
        vault.approveMilestoneWithSignature(0, 0, deadline, relayer, signature);

        vm.prank(issuer);
        vault.revoke();
        vm.prank(relayer);
        vm.expectRevert(GrantVault.AlreadyRevoked.selector);
        vault.approveMilestoneWithSignature(0, 0, deadline, relayer, signature);

        SponsoredGrantVault liveVault = createSponsoredMilestone();
        bytes memory expired = signReview(liveVault, 0, 0, deadline, relayer);
        vm.warp(deadline + 1);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredActionExpired.selector);
        liveVault.approveMilestoneWithSignature(0, 0, deadline, relayer, expired);
    }

    function test_sponsoredReviewRejectsAlreadyApprovedMilestone() public {
        SponsoredGrantVault vault = createSponsoredMilestone();
        uint256 deadline = block.timestamp + 1 days;
        vm.prank(vm.addr(REVIEWER_PRIVATE_KEY));
        vault.approveMilestone(0);
        bytes memory signature = signReview(vault, 0, 0, deadline, relayer);
        vm.prank(relayer);
        vm.expectRevert(GrantVault.MilestoneAlreadyApproved.selector);
        vault.approveMilestoneWithSignature(0, 0, deadline, relayer, signature);
        assertEq(vault.sponsoredReviewNonce(), 0);
    }

    function test_claimAndReviewNoncesAreIndependent() public {
        SponsoredGrantVault vault = createSponsoredHybrid();
        vm.warp(START + 180 days);
        uint256 deadline = START + 200 days;
        bytes memory review = signReview(vault, 0, 0, deadline, relayer);
        vm.prank(relayer);
        vault.approveMilestoneWithSignature(0, 0, deadline, relayer, review);
        assertEq(vault.sponsoredReviewNonce(), 1);
        assertEq(vault.sponsoredClaimNonce(), 0);

        uint256 claimable = vault.claimableAmount();
        bytes memory claim = signClaim(vault, claimable, 0, deadline, relayer);
        vm.prank(relayer);
        vault.claimWithSignature(claimable, 0, deadline, relayer, claim);
        assertEq(vault.sponsoredClaimNonce(), 1);
        assertEq(vault.sponsoredReviewNonce(), 1);
    }
}
