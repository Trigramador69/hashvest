// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashVestTestBase, TestToken, FeeToken} from "./helpers/HashVestTestBase.sol";
import {HashVestFactory} from "../src/HashVestFactory.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {DemoEligibilityProvider} from "../src/DemoEligibilityProvider.sol";
import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CallbackToken is TestToken {
    address public target;
    bytes private payload;
    bool private duringFunding;
    bool public callbackSucceeded;
    bool public callbackAttempted;
    bytes public callbackResult;
    uint256 public claimedDuringTransfer;

    function configure(address target_, bytes memory payload_, bool duringFunding_) external {
        target = target_;
        payload = payload_;
        duringFunding = duringFunding_;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (duringFunding && target != address(0)) {
            callbackAttempted = true;
            (callbackSucceeded, callbackResult) = target.call(payload);
        }
        return super.transferFrom(from, to, value);
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        if (!duringFunding && target != address(0)) {
            claimedDuringTransfer = GrantVault(target).claimedAmount();
            callbackAttempted = true;
            (callbackSucceeded, callbackResult) = target.call(payload);
        }
        return super.transfer(to, value);
    }
}

contract FailingTransferToken is TestToken {
    function transfer(address, uint256) public pure override returns (bool) {
        return false;
    }
}

contract RevertingEligibilityProvider {
    error ProviderUnavailable();

    function isEligible(address) external pure returns (bool) {
        revert ProviderUnavailable();
    }
}

// The external ABI must reject out-of-range enum values before deploying or funding.
struct MalformedGrantConfig {
    string title;
    address token;
    address beneficiary;
    address reviewer;
    uint256 totalAllocation;
    uint8 strategy;
    uint256 start;
    uint256 cliff;
    uint256 duration;
    address eligibilityProvider;
}

contract AdversarialTest is HashVestTestBase {
    function test_issuerCannotApproveMilestones() public {
        GrantVault vault = createMilestoneGrant(UnlockStrategy.MILESTONE);
        vm.prank(issuer);
        vm.expectRevert(GrantVault.UnauthorizedReviewer.selector);
        vault.approveMilestone(0);
        assertEq(vault.milestoneUnlockedAmount(), 0);
    }

    function test_beneficiaryCannotApproveMilestones() public {
        GrantVault vault = createMilestoneGrant(UnlockStrategy.HYBRID);
        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.UnauthorizedReviewer.selector);
        vault.approveMilestone(0);
    }

    function test_milestoneCannotBeApprovedTwice() public {
        GrantVault vault = createMilestoneGrant(UnlockStrategy.MILESTONE);
        vm.startPrank(reviewer);
        vault.approveMilestone(0);
        vm.expectRevert(GrantVault.MilestoneAlreadyApproved.selector);
        vault.approveMilestone(0);
        vm.stopPrank();
        assertEq(vault.milestoneUnlockedAmount(), 40_000 ether);
    }

    function test_invalidMilestoneIndexRejected() public {
        GrantVault vault = createMilestoneGrant(UnlockStrategy.HYBRID);
        vm.prank(reviewer);
        vm.expectRevert(GrantVault.InvalidMilestoneIndex.selector);
        vault.approveMilestone(2);
    }

    function test_nonBeneficiaryCannotClaimUnlockedTokens() public {
        GrantVault vault = createTime();
        vm.warp(START + DURATION);
        vm.prank(issuer);
        vm.expectRevert(GrantVault.UnauthorizedBeneficiary.selector);
        vault.claim();
        vm.prank(reviewer);
        vm.expectRevert(GrantVault.UnauthorizedBeneficiary.selector);
        vault.claim();
        assertEq(vault.claimedAmount(), 0);
    }

    function test_claimBeforeUnlockRejected() public {
        GrantVault vault = createTime();
        vm.prank(beneficiary);
        vm.expectRevert(GrantVault.NothingToClaim.selector);
        vault.claim();
    }

    function test_sameUnlockedAllocationCannotBeClaimedTwice() public {
        GrantVault vault = createTime();
        vm.warp(START + 90 days);
        vm.startPrank(beneficiary);
        vault.claim();
        vm.expectRevert(GrantVault.NothingToClaim.selector);
        vault.claim();
        vm.stopPrank();
        assertEq(token.balanceOf(beneficiary), 25_000 ether);
    }

    function test_surplusTokensNeverIncreaseGrantAllocation() public {
        GrantVault vault = createTime();
        token.mint(address(vault), ALLOCATION);
        vm.warp(START + DURATION);
        vm.prank(beneficiary);
        vault.claim();
        assertEq(vault.claimedAmount(), ALLOCATION);
        assertEq(token.balanceOf(address(vault)), ALLOCATION);
        assertEq(vault.claimableAmount(), 0);
    }

    function test_insufficientAllowanceLeavesNoGrantOrTransferredTokens() public {
        vm.prank(issuer);
        token.approve(address(factory), ALLOCATION - 1);
        vm.prank(issuer);
        vm.expectRevert();
        factory.createGrant(config(UnlockStrategy.TIME), new MilestoneInput[](0));
        assertEq(factory.getGrantsByIssuer(issuer).length, 0);
        assertEq(token.balanceOf(issuer), ALLOCATION * 10);
    }

    function test_insufficientBalanceLeavesNoGrant() public {
        address emptyIssuer = makeAddr("emptyIssuer");
        vm.startPrank(emptyIssuer);
        token.approve(address(factory), ALLOCATION);
        vm.expectRevert();
        factory.createGrant(config(UnlockStrategy.TIME), new MilestoneInput[](0));
        vm.stopPrank();
        assertEq(factory.getGrantsByIssuer(emptyIssuer).length, 0);
    }

    function test_preexistingDonationCannotHideFeeOnTransfer() public {
        FeeToken feeToken = new FeeToken();
        address predictedVault = vm.computeCreateAddress(address(factory), vm.getNonce(address(factory)));
        feeToken.mint(predictedVault, ALLOCATION);
        feeToken.mint(issuer, ALLOCATION);
        vm.prank(issuer);
        feeToken.approve(address(factory), ALLOCATION);
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.token = address(feeToken);
        vm.prank(issuer);
        vm.expectRevert(HashVestFactory.UnderfundedGrant.selector);
        factory.createGrant(grant, new MilestoneInput[](0));
        assertEq(predictedVault.code.length, 0);
        assertEq(feeToken.balanceOf(predictedVault), ALLOCATION);
        assertEq(feeToken.balanceOf(issuer), ALLOCATION);
    }

    function test_factoryRejectsReentrancyDuringTokenFunding() public {
        CallbackToken callbackToken = new CallbackToken();
        callbackToken.mint(issuer, ALLOCATION);
        vm.prank(issuer);
        callbackToken.approve(address(factory), ALLOCATION);
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.token = address(callbackToken);
        callbackToken.configure(
            address(factory), abi.encodeCall(factory.createGrant, (grant, new MilestoneInput[](0))), true
        );
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        assertTrue(callbackToken.callbackAttempted());
        assertFalse(callbackToken.callbackSucceeded());
        assertEq(
            callbackToken.callbackResult(),
            abi.encodeWithSelector(ReentrancyGuard.ReentrancyGuardReentrantCall.selector)
        );
        assertEq(callbackToken.balanceOf(address(vault)), ALLOCATION);
        assertEq(factory.getGrantsByIssuer(issuer).length, 1);
    }

    function test_claimRejectsReentrancyAndUpdatesStateBeforeTransfer() public {
        CallbackToken callbackToken = new CallbackToken();
        callbackToken.mint(issuer, ALLOCATION);
        vm.prank(issuer);
        callbackToken.approve(address(factory), ALLOCATION);
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.token = address(callbackToken);
        grant.beneficiary = address(callbackToken);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        callbackToken.configure(address(vault), abi.encodeCall(vault.claim, ()), false);
        vm.warp(START + DURATION);
        vm.prank(address(callbackToken));
        vault.claim();
        assertTrue(callbackToken.callbackAttempted());
        assertFalse(callbackToken.callbackSucceeded());
        assertEq(
            callbackToken.callbackResult(),
            abi.encodeWithSelector(ReentrancyGuard.ReentrancyGuardReentrantCall.selector)
        );
        assertEq(callbackToken.claimedDuringTransfer(), ALLOCATION);
        assertEq(vault.claimedAmount(), ALLOCATION);
        assertEq(callbackToken.balanceOf(address(callbackToken)), ALLOCATION);
        assertEq(callbackToken.balanceOf(address(vault)), 0);
    }

    function test_failedTokenTransferRollsBackClaimedState() public {
        FailingTransferToken badToken = new FailingTransferToken();
        badToken.mint(issuer, ALLOCATION);
        vm.prank(issuer);
        badToken.approve(address(factory), ALLOCATION);
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.token = address(badToken);
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        vm.warp(START + DURATION);
        vm.prank(beneficiary);
        vm.expectRevert(abi.encodeWithSelector(SafeERC20.SafeERC20FailedOperation.selector, address(badToken)));
        vault.claim();
        assertEq(vault.claimedAmount(), 0);
        assertEq(vault.claimableAmount(), ALLOCATION);
        assertEq(badToken.balanceOf(address(vault)), ALLOCATION);
    }

    function test_unavailableEligibilityProviderFailsClosed() public {
        GrantConfig memory grant = config(UnlockStrategy.TIME);
        grant.eligibilityProvider = address(new RevertingEligibilityProvider());
        vm.prank(issuer);
        GrantVault vault = GrantVault(factory.createGrant(grant, new MilestoneInput[](0)));
        vm.warp(START + DURATION);
        vm.prank(beneficiary);
        vm.expectRevert(RevertingEligibilityProvider.ProviderUnavailable.selector);
        vault.claim();
        assertEq(vault.claimedAmount(), 0);
    }

    function test_onlyDemoAdministratorCanChangeEligibility() public {
        DemoEligibilityProvider provider = new DemoEligibilityProvider(issuer);
        vm.prank(beneficiary);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, beneficiary));
        provider.setEligible(beneficiary, true);
        assertFalse(provider.isEligible(beneficiary));
    }

    function test_malformedStrategyRejectedByExternalAbi() public {
        MalformedGrantConfig memory grant = MalformedGrantConfig({
            title: "Malformed",
            token: address(token),
            beneficiary: beneficiary,
            reviewer: reviewer,
            totalAllocation: ALLOCATION,
            strategy: 3,
            start: START,
            cliff: 0,
            duration: DURATION,
            eligibilityProvider: address(0)
        });
        vm.prank(issuer);
        (bool success,) =
            address(factory).call(abi.encodeWithSelector(factory.createGrant.selector, grant, new MilestoneInput[](0)));
        assertFalse(success);
        assertEq(factory.getGrantsByIssuer(issuer).length, 0);
        assertEq(token.balanceOf(issuer), ALLOCATION * 10);
    }
}
