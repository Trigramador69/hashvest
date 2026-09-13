// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {SponsoredGrantVault} from "../src/SponsoredGrantVault.sol";

import {HashVestTestBase} from "./helpers/HashVestTestBase.sol";

contract SponsoredClaimTest is HashVestTestBase {
    uint256 private constant BENEFICIARY_PRIVATE_KEY = 0xA11CE;
    address private relayer = makeAddr("sponsored relayer");

    function sponsoredConfig() internal view returns (GrantConfig memory grant) {
        grant = config(UnlockStrategy.TIME);
        grant.beneficiary = vm.addr(BENEFICIARY_PRIVATE_KEY);
    }

    function createSponsoredTime() internal returns (SponsoredGrantVault vault) {
        vm.prank(issuer);
        vault = SponsoredGrantVault(factory.createSponsoredGrant(sponsoredConfig(), new MilestoneInput[](0)));
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

    function test_sponsoredFirstClaimBindsBeneficiaryRelayerAndExactAmount() public {
        SponsoredGrantVault vault = createSponsoredTime();
        vm.warp(START + 90 days);
        uint256 amount = 10_000 ether;
        uint256 deadline = START + 180 days;
        bytes memory signature = signClaim(vault, amount, 0, deadline, relayer);

        vm.prank(relayer);
        vault.claimWithSignature(amount, 0, deadline, relayer, signature);

        assertEq(vault.claimedAmount(), amount);
        assertEq(vault.sponsoredClaimNonce(), 1);
        assertTrue(vault.sponsoredClaimUsed());
        assertEq(token.balanceOf(vm.addr(BENEFICIARY_PRIVATE_KEY)), amount);
        assertEq(vault.claimableAmount(), 15_000 ether);
    }

    function test_sponsoredClaimCannotBeReplayedAndFutureClaimsRemainManual() public {
        SponsoredGrantVault vault = createSponsoredTime();
        vm.warp(START + 90 days);
        uint256 amount = 10_000 ether;
        uint256 deadline = START + 180 days;
        bytes memory signature = signClaim(vault, amount, 0, deadline, relayer);

        vm.prank(relayer);
        vault.claimWithSignature(amount, 0, deadline, relayer, signature);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredClaimAlreadyUsed.selector);
        vault.claimWithSignature(amount, 0, deadline, relayer, signature);

        vm.prank(vm.addr(BENEFICIARY_PRIVATE_KEY));
        vault.claim();
        assertEq(vault.claimedAmount(), 25_000 ether);
    }

    function test_sponsoredClaimRejectsWrongRelayerAndWrongSignature() public {
        SponsoredGrantVault vault = createSponsoredTime();
        vm.warp(START + 90 days);
        uint256 amount = 10_000 ether;
        uint256 deadline = START + 180 days;
        bytes memory signature = signClaim(vault, amount, 0, deadline, relayer);
        address otherRelayer = makeAddr("other relayer");

        vm.prank(otherRelayer);
        vm.expectRevert(SponsoredGrantVault.UnauthorizedRelayer.selector);
        vault.claimWithSignature(amount, 0, deadline, relayer, signature);

        bytes memory wrongSignature = signClaim(vault, amount, 0, deadline, otherRelayer);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredClaimSignatureInvalid.selector);
        vault.claimWithSignature(amount, 0, deadline, relayer, wrongSignature);
        assertEq(vault.claimedAmount(), 0);
    }

    function test_sponsoredClaimRejectsExpiredNonceAndUnavailableAmount() public {
        SponsoredGrantVault vault = createSponsoredTime();
        vm.warp(START + 90 days);
        uint256 amount = 10_000 ether;

        bytes memory expired = signClaim(vault, amount, 0, START + 1, relayer);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredClaimExpired.selector);
        vault.claimWithSignature(amount, 0, START + 1, relayer, expired);

        uint256 deadline = START + 180 days;
        bytes memory wrongNonce = signClaim(vault, amount, 1, deadline, relayer);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredClaimNonceMismatch.selector);
        vault.claimWithSignature(amount, 1, deadline, relayer, wrongNonce);

        bytes memory tooMuch = signClaim(vault, 25_001 ether, 0, deadline, relayer);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredClaimAmountUnavailable.selector);
        vault.claimWithSignature(25_001 ether, 0, deadline, relayer, tooMuch);
    }

    function test_manualClaimConsumesFirstClaimSponsorship() public {
        SponsoredGrantVault vault = createSponsoredTime();
        vm.warp(START + 90 days);
        vm.prank(vm.addr(BENEFICIARY_PRIVATE_KEY));
        vault.claim();

        uint256 deadline = START + 180 days;
        bytes memory signature = signClaim(vault, 1 ether, 0, deadline, relayer);
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredClaimAlreadyUsed.selector);
        vault.claimWithSignature(1 ether, 0, deadline, relayer, signature);
    }

    function test_legacyVaultsDoNotExposeSponsoredClaimSurface() public {
        GrantVault vault = createTime();
        (bool success,) = address(vault).call(abi.encodeWithSignature("supportsSponsoredClaims()"));
        assertFalse(success);
    }
}
