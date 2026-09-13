// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashVestTestBase, TestToken} from "./helpers/HashVestTestBase.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {SponsoredGrantVault} from "../src/SponsoredGrantVault.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";

contract InvariantsAndSecurityTest is HashVestTestBase {
    uint256 private constant BENEFICIARY_KEY = 0xAA11;
    address private relayer = makeAddr("relayer");

    function test_storagePackingRevokedAtMatchesTimestamp() public {
        GrantVault vault = createRevocableTime();
        assertEq(vault.revoked(), false);
        assertEq(vault.revokedAt(), 0);

        uint256 revokeTime = START + 120 days;
        vm.warp(revokeTime);
        vm.prank(issuer);
        vault.revoke();

        assertTrue(vault.revoked());
        assertEq(vault.revokedAt(), revokeTime);
    }

    function test_zeroClaimRevertsImmediatelyWithoutTransfer() public {
        GrantVault vault = createTime();
        // At START (cliff = 90 days, initialUnlock = 0), claimable is 0
        assertEq(vault.claimableAmount(), 0);
        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.NothingToClaim.selector);
        vault.claim();
    }

    function testFuzz_claimConservationInvariant(
        uint64 elapsedSeed,
        uint128 initialUnlockSeed,
        uint64 cliffSeed,
        uint64 durationSeed
    ) public {
        uint256 duration = bound(durationSeed, 10 days, 3650 days);
        uint256 cliff = bound(cliffSeed, 0, duration);
        uint256 initialUnlock = bound(initialUnlockSeed, 0, ALLOCATION);

        GrantConfig memory cfg = config(UnlockStrategy.TIME);
        cfg.duration = duration;
        cfg.cliff = cliff;
        cfg.initialUnlock = initialUnlock;

        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(cfg, new MilestoneInput[](0)));

        uint256 elapsed = bound(elapsedSeed, 0, duration * 3);
        vm.warp(START + elapsed);

        uint256 unlocked = vault.unlockedAmount();
        assertLe(unlocked, ALLOCATION, "Unlocked must not exceed allocation");

        uint256 claimable = vault.claimableAmount();
        assertEq(unlocked, claimable + vault.claimedAmount(), "Conservation: unlocked == claimable + claimed");

        if (claimable > 0) {
            vm.prank(beneficiary);
            vault.claim();

            assertEq(vault.claimableAmount(), 0, "Claimable must be 0 immediately after claim");
            assertEq(vault.claimedAmount(), unlocked, "Claimed amount must match unlocked");
            assertEq(token.balanceOf(beneficiary), unlocked, "Beneficiary balance must match unlocked");
            assertEq(token.balanceOf(address(vault)), ALLOCATION - unlocked, "Vault balance must match remainder");
        }
    }

    function test_crossVaultSignatureReplayBlocked() public {
        address beneficiaryWallet = vm.addr(BENEFICIARY_KEY);
        GrantConfig memory cfgA = config(UnlockStrategy.TIME);
        cfgA.beneficiary = beneficiaryWallet;
        GrantConfig memory cfgB = config(UnlockStrategy.TIME);
        cfgB.beneficiary = beneficiaryWallet;

        vm.prank(issuer);
        SponsoredGrantVault vaultA = SponsoredGrantVault(factory.createSponsoredGrant(cfgA, new MilestoneInput[](0)));
        vm.prank(issuer);
        SponsoredGrantVault vaultB = SponsoredGrantVault(factory.createSponsoredGrant(cfgB, new MilestoneInput[](0)));

        vm.warp(START + 180 days);
        uint256 deadline = START + 200 days;
        uint256 amount = 10_000 ether;

        // Sign for vaultA
        bytes32 digestA = vaultA.hashSponsoredClaim(amount, 0, deadline, relayer);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(BENEFICIARY_KEY, digestA);
        bytes memory sigA = abi.encodePacked(r, s, v);

        // Try to replay sigA on vaultB
        vm.prank(relayer);
        vm.expectRevert(SponsoredGrantVault.SponsoredActionSignatureInvalid.selector);
        vaultB.claimWithSignature(amount, 0, deadline, relayer, sigA);

        // VaultA accepts its own signature
        vm.prank(relayer);
        vaultA.claimWithSignature(amount, 0, deadline, relayer, sigA);
        assertEq(vaultA.claimedAmount(), amount);
    }

    function test_signatureMalleabilityRejected() public {
        address beneficiaryWallet = vm.addr(BENEFICIARY_KEY);
        GrantConfig memory cfg = config(UnlockStrategy.TIME);
        cfg.beneficiary = beneficiaryWallet;

        vm.prank(issuer);
        SponsoredGrantVault vault = SponsoredGrantVault(factory.createSponsoredGrant(cfg, new MilestoneInput[](0)));

        vm.warp(START + 180 days);
        uint256 deadline = START + 200 days;
        uint256 amount = 10_000 ether;

        bytes32 digest = vault.hashSponsoredClaim(amount, 0, deadline, relayer);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(BENEFICIARY_KEY, digest);

        // Secp256k1 order N
        uint256 n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        // Invert s to create an invalid malleable signature
        bytes32 invertedS = bytes32(n - uint256(s));
        uint8 invertedV = v == 27 ? 28 : 27;
        bytes memory malleableSig = abi.encodePacked(r, invertedS, invertedV);

        vm.prank(relayer);
        vm.expectRevert(); // OpenZeppelin ECDSA explicitly reverts on upper-half s
        vault.claimWithSignature(amount, 0, deadline, relayer, malleableSig);
    }
}
