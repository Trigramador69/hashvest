// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GrantConfig, MilestoneInput, UnlockStrategy} from "../src/GrantTypes.sol";
import {QuorumGrantVault} from "../src/QuorumGrantVault.sol";
import {GrantVault} from "../src/GrantVault.sol";
import {HashVestTestBase} from "./helpers/HashVestTestBase.sol";

contract QuorumTest is HashVestTestBase {
    address internal rev1 = makeAddr("reviewer1");
    address internal rev2 = makeAddr("reviewer2");
    address internal rev3 = makeAddr("reviewer3");
    address internal rev4 = makeAddr("reviewer4");

    function quorumConfig(UnlockStrategy strategy) internal view returns (GrantConfig memory) {
        GrantConfig memory c = config(strategy);
        c.reviewer = address(0); // Handled via quorum reviewers
        return c;
    }

    function milestoneInputs() internal pure returns (MilestoneInput[] memory inputs) {
        inputs = new MilestoneInput[](2);
        inputs[0] = MilestoneInput("Milestone 1", 40_000 ether);
        inputs[1] = MilestoneInput("Milestone 2", 60_000 ether);
    }

    function test_revertsOnZeroReviewers() public {
        address[] memory reviewers = new address[](0);
        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidAddress.selector);
        factory.createQuorumGrant(quorumConfig(UnlockStrategy.MILESTONE), reviewers, 1, milestoneInputs());
    }

    function test_revertsOnExcessiveReviewers() public {
        address[] memory reviewers = new address[](11);
        for (uint256 i; i < 11; ++i) {
            reviewers[i] = makeAddr(string(abi.encodePacked("rev", i)));
        }
        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidAddress.selector);
        factory.createQuorumGrant(quorumConfig(UnlockStrategy.MILESTONE), reviewers, 5, milestoneInputs());
    }

    function test_revertsOnZeroThreshold() public {
        address[] memory reviewers = new address[](2);
        reviewers[0] = rev1;
        reviewers[1] = rev2;
        vm.prank(issuer);
        vm.expectRevert(QuorumGrantVault.InvalidQuorumThreshold.selector);
        factory.createQuorumGrant(quorumConfig(UnlockStrategy.MILESTONE), reviewers, 0, milestoneInputs());
    }

    function test_revertsOnThresholdGreaterThanReviewerCount() public {
        address[] memory reviewers = new address[](2);
        reviewers[0] = rev1;
        reviewers[1] = rev2;
        vm.prank(issuer);
        vm.expectRevert(QuorumGrantVault.InvalidQuorumThreshold.selector);
        factory.createQuorumGrant(quorumConfig(UnlockStrategy.MILESTONE), reviewers, 3, milestoneInputs());
    }

    function test_revertsOnZeroAddressInReviewers() public {
        address[] memory reviewers = new address[](3);
        reviewers[0] = rev1;
        reviewers[1] = address(0);
        reviewers[2] = rev3;
        vm.prank(issuer);
        vm.expectRevert(GrantVault.InvalidAddress.selector);
        factory.createQuorumGrant(quorumConfig(UnlockStrategy.MILESTONE), reviewers, 2, milestoneInputs());
    }

    function test_revertsOnDuplicateReviewer() public {
        address[] memory reviewers = new address[](3);
        reviewers[0] = rev1;
        reviewers[1] = rev2;
        reviewers[2] = rev1; // Duplicate
        vm.prank(issuer);
        vm.expectRevert(QuorumGrantVault.DuplicateReviewer.selector);
        factory.createQuorumGrant(quorumConfig(UnlockStrategy.MILESTONE), reviewers, 2, milestoneInputs());
    }

    function test_1ofNQuorumUnlocksOnFirstApproval() public {
        address[] memory reviewers = new address[](3);
        reviewers[0] = rev1;
        reviewers[1] = rev2;
        reviewers[2] = rev3;

        vm.prank(issuer);
        address vaultAddr =
            factory.createQuorumGrant(quorumConfig(UnlockStrategy.MILESTONE), reviewers, 1, milestoneInputs());
        QuorumGrantVault vault = QuorumGrantVault(vaultAddr);

        assertTrue(vault.supportsQuorumReviewers());
        assertEq(vault.getReviewerCount(), 3);
        assertEq(vault.threshold(), 1);

        // Factory indexes all reviewers
        assertEq(factory.getGrantsByReviewer(rev1).length, 1);
        assertEq(factory.getGrantsByReviewer(rev2).length, 1);
        assertEq(factory.getGrantsByReviewer(rev3).length, 1);

        // Reviewer 2 approves milestone 0
        vm.prank(rev2);
        vault.approveMilestone(0);

        (uint256 approvals, uint256 thresh, bool approved) = vault.getMilestoneApprovalProgress(0);
        assertEq(approvals, 1);
        assertEq(thresh, 1);
        assertTrue(approved);
        assertEq(vault.unlockedAmount(), 40_000 ether);

        // Beneficiary can claim
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 40_000 ether);
    }

    function test_MofNQuorumRequiresThresholdConsensus() public {
        address[] memory reviewers = new address[](3);
        reviewers[0] = rev1;
        reviewers[1] = rev2;
        reviewers[2] = rev3;

        vm.prank(issuer);
        address vaultAddr =
            factory.createQuorumGrant(quorumConfig(UnlockStrategy.MILESTONE), reviewers, 2, milestoneInputs());
        QuorumGrantVault vault = QuorumGrantVault(vaultAddr);

        assertEq(vault.threshold(), 2);

        // Non-reviewer attempts approval
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(GrantVault.UnauthorizedReviewer.selector);
        vault.approveMilestone(0);

        // Reviewer 1 approves (1 of 2)
        vm.prank(rev1);
        vault.approveMilestone(0);

        assertTrue(vault.hasApproved(0, rev1));
        assertFalse(vault.hasApproved(0, rev2));

        (uint256 approvals1, uint256 thresh1, bool approved1) = vault.getMilestoneApprovalProgress(0);
        assertEq(approvals1, 1);
        assertEq(thresh1, 2);
        assertFalse(approved1);
        assertEq(vault.unlockedAmount(), 0);

        // Reviewer 1 attempts duplicate approval
        vm.prank(rev1);
        vm.expectRevert(QuorumGrantVault.ReviewerAlreadyApproved.selector);
        vault.approveMilestone(0);

        // Reviewer 3 approves (2 of 2) -> Quorum reached!
        vm.prank(rev3);
        vault.approveMilestone(0);

        (uint256 approvals2,, bool approved2) = vault.getMilestoneApprovalProgress(0);
        assertEq(approvals2, 2);
        assertTrue(approved2);
        assertEq(vault.unlockedAmount(), 40_000 ether);

        // Reviewer 2 attempts approval after milestone already approved
        vm.prank(rev2);
        vm.expectRevert(GrantVault.MilestoneAlreadyApproved.selector);
        vault.approveMilestone(0);

        // Beneficiary claims unlocked amount
        vm.prank(beneficiary);
        vault.claim();
        assertEq(token.balanceOf(beneficiary), 40_000 ether);
        assertEq(vault.claimableAmount(), 0);
    }

    function test_quorumFreezesWhenRevoked() public {
        address[] memory reviewers = new address[](3);
        reviewers[0] = rev1;
        reviewers[1] = rev2;
        reviewers[2] = rev3;

        GrantConfig memory c = quorumConfig(UnlockStrategy.MILESTONE);
        c.revocable = true;

        vm.prank(issuer);
        address vaultAddr = factory.createQuorumGrant(c, reviewers, 2, milestoneInputs());
        QuorumGrantVault vault = QuorumGrantVault(vaultAddr);

        // Reviewer 1 approves milestone 0
        vm.prank(rev1);
        vault.approveMilestone(0);

        // Issuer revokes grant
        vm.prank(issuer);
        vault.revoke();
        assertTrue(vault.revoked());

        // Reviewer 2 attempts to approve revoked grant
        vm.prank(rev2);
        vm.expectRevert(GrantVault.AlreadyRevoked.selector);
        vault.approveMilestone(0);
    }
}
