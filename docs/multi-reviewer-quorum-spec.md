# Multi-Reviewer Quorum Model Specification (1-of-N and M-of-N Approval)

## Executive Summary

This document specifies the onchain architecture, quorum arithmetic, gas bounds, and client integration for multi-reviewer milestone grants in HashVest.

The existing `GrantVault` defines a single immutable reviewer (`address public reviewer`). While efficient for simple grants, organizational grants and collaborative treasuries require distributed approval semantics to prevent single points of failure, key loss, or unilateral censorship.

The versioned `QuorumGrantVault` contract extends `GrantVault`, enabling bounded 1-of-N and M-of-N milestone approval directly onchain.

---

## Quorum Invariants and Arithmetic

### Reviewer Set Bounds

1. **Bounded Size**: The reviewer set $R = \{r_1, r_2, \dots, r_N\}$ is bounded between $1 \le N \le 10$.
   - Prevents unbounded iteration, excessive deployment gas, and block-limit risks.
2. **Reviewer Uniqueness**: For any $i \neq j$, $r_i \neq r_j$. Duplicate addresses are rejected at creation (`DuplicateReviewer`).
3. **No Zero Address**: For every $r_i \in R$, $r_i \neq \text{address}(0)$ (`InvalidAddress`).

### Quorum Threshold ($M$)

1. **Valid Range**: The required approval threshold $M$ satisfies $1 \le M \le N$ (`InvalidQuorumThreshold`).
   - **$M = 1, N = 1$**: Single-reviewer grant (identical to baseline GrantVault V1).
   - **$M = 1, N > 1$**: 1-of-N quorum (any designated reviewer can approve).
   - **$1 < M \le N$**: M-of-N quorum (requires independent consensus of at least $M$ distinct reviewers).

### State Transitions per Milestone

Let $S_i$ be the approval state of milestone $i \in [0, \text{milestones.length} - 1]$:

1. **Approval Tracking**:
   - `hasApprovedMilestone[i][reviewer]`: boolean mapping tracking whether reviewer $r$ has already voted on milestone $i$.
   - `milestoneApprovalCount[i]`: integer counter tracking the cumulative number of unique reviewer approvals.
2. **Duplicate Prevention**:
   - If reviewer $r$ calls `approveMilestone(i)` when `hasApprovedMilestone[i][r] == true`, the call reverts with `ReviewerAlreadyApproved`.
3. **Quorum Fulfillment**:
   - Each valid reviewer approval increments `milestoneApprovalCount[i]`.
   - The contract emits `MilestoneApprovalSubmitted(reviewer, i, currentCount, threshold)`.
   - When `currentCount == threshold`:
     - `milestones[i].approved = true`.
     - `milestoneUnlockedAmount += milestones[i].amount`.
     - The contract emits the canonical `MilestoneApproved(reviewer, i, milestones[i].amount)`.
4. **Post-Quorum Invariant**:
   - Once `milestones[i].approved == true`, subsequent approval attempts revert with `MilestoneAlreadyApproved`.
5. **Revocation Invariant**:
   - If the grant is revoked (`revoked == true`), any call to `approveMilestone(i)` reverts with `AlreadyRevoked`. Unearned tokens remain clawed back to the issuer.

---

## Contract Architecture & Backwards Compatibility

### Contract Hierarchy

```text
      GrantVault (Base)
     /                 \
SponsoredGrantVault   QuorumGrantVault
```

- `GrantVault`:
  - `milestones` visibility changed from `private` to `internal`.
  - `approveMilestone(uint256 index)` marked `virtual`.
  - Backwards-compatible `reviewer()` getter returns `reviewers[0]` when accessed on `QuorumGrantVault`.
- `QuorumGrantVault`:
  - Inherits full vesting mathematics (`vestedByTime`, `unlockedAmount`, `claimableAmount`, `claim`, `revoke`, `initialUnlock`).
  - Overrides `approveMilestone(uint256 index)` with M-of-N quorum checks.
  - Implements marker `supportsQuorumReviewers() external pure returns (bool) { return true; }`.
  - Exposes view helpers:
    - `getReviewers() external view returns (address[] memory)`
    - `getReviewerCount() external view returns (uint256)`
    - `hasApproved(uint256 index, address reviewer) external view returns (bool)`
    - `getMilestoneApprovalProgress(uint256 index) external view returns (uint256 approvals, uint256 quorumThreshold, bool isFullyApproved)`

### Factory Role Discovery (`HashVestFactory`)

- `createGrant(...)`: Continues deploying single-reviewer `GrantVault` or `SponsoredGrantVault`.
- `createQuorumGrant(...)`:
  - Validates reviewer bounds and uniqueness.
  - Deploys `QuorumGrantVault`.
  - Indexes the vault address in `grantsByReviewer[r]` for **every** reviewer $r \in R$, ensuring all reviewers see the grant in their dashboard review queues.

---

## Authority Invariant: Onchain Truth vs. Cloud

- Cloud role labels (e.g. `Treasury Reviewer`, `Owner`) are presentation metadata only.
- In `apps/web/lib/protocol/roles.ts`, `isReviewer` is derived exclusively by querying `vault.getReviewers()` or `vault.reviewer()` onchain.
- Milestone approval requires an authentic transaction signed by a wallet in the contract's reviewer set.
