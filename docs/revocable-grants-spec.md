# HashVest Revocable Grants: State-Transition & Accounting Specification (HAS-5)

## 1. Problem & Executive Summary

Issuers need a controlled clawback mechanism to recover unearned capital in situations such as project cancellation, breach of milestones, or premature departure. However, decentralized trust requires that **revocation must never erase value already earned or claimed by the beneficiary**.

The previously deployed `GrantVault` implementation is non-revocable and immutable. The protocol must:
1. Support an explicit `revocable` flag on newly instantiated grants.
2. Ensure non-revocable grants are permanently immutable and impossible to revoke.
3. Enforce a one-way state transition upon revocation.
4. Strictly protect beneficiary rights: earned value is preserved, claimed tokens remain untouched, and earned but unclaimed tokens remain claimable.
5. Return exactly the unearned portion (`totalAllocation - earnedAmount`) to the issuer.
6. Preserve full compatibility and readability for previously deployed non-revocable vaults.

---

## 2. Mandatory Semantic Example & Accounting Model

### Semantic Baseline Example
Given:
- `totalAllocation`: 100,000 tokens
- `unlockedAmount()` (vested/earned at time of revocation): 40,000 tokens
- `claimedAmount`: 20,000 tokens

Upon `revoke()` by the issuer:
1. **Already claimed preservation**: 20,000 tokens already transferred to the beneficiary remain entirely in beneficiary's custody.
2. **Earned unclaimed entitlement**: 20,000 tokens (`40,000 earned - 20,000 claimed`) remain claimable by the beneficiary at any subsequent time via `claim()`.
3. **Issuer recovery**: 60,000 unearned tokens (`100,000 allocation - 40,000 earned`) are transferred atomically back to the issuer's wallet.
4. **Conservation Invariant**:
   $$\text{claimedAmount} + \text{claimableAmount} + \text{recoveredAmount} = \text{totalAllocation}$$
   $$20,000 + 20,000 + 60,000 = 100,000$$

### Strategy-Specific Accounting Rules

#### A. TIME Vesting Strategy
- **Calculation at Revocation ($t_{\text{rev}}$)**:
  - If $t_{\text{rev}} < \text{start} + \text{cliff}$: $\text{earned} = 0$. Issuer recovers $100\%$; beneficiary entitlement is $0$.
  - If $t_{\text{rev}} \ge \text{start} + \text{duration}$: $\text{earned} = \text{totalAllocation}$. Issuer recovers $0$; beneficiary preserves $100\%$.
  - Otherwise: $\text{earned} = \lfloor \frac{\text{totalAllocation} \times (t_{\text{rev}} - \text{start})}{\text{duration}} \rfloor$.
- **Post-Revocation Time Behavior**: Time advancement ceases permanently for this grant. The linear curve is frozen at $t_{\text{rev}}$.

#### B. MILESTONE Strategy
- **Calculation at Revocation**:
  - $\text{earned} = \text{milestoneUnlockedAmount}$ (sum of all milestones approved by reviewer strictly prior to revocation).
- **Pending / Unapproved Milestones**:
  - Unapproved milestones do **not** count as earned.
  - Reviewer calling `approveMilestone()` post-revocation reverts with `AlreadyRevoked()`. No new milestone approvals are permitted.

#### C. HYBRID Strategy
- **Calculation at Revocation**:
  - $\text{earned} = \min(\text{vestedByTime}(t_{\text{rev}}), \text{milestoneUnlockedAmount})$.
  - Both time and milestone criteria must be satisfied at or prior to $t_{\text{rev}}$.
  - *Pending reviewer-approved unlocks*: If reviewer approved milestones totaling 50,000, but time vested is only 40,000, earned is $\min(40,000, 50,000) = 40,000$. The extra 10,000 unvested time capacity expires permanently because vesting terminates.
  - If time vested is 60,000 but approved milestones total 40,000, earned is $\min(60,000, 40,000) = 40,000$. Unapproved milestones cannot be approved post-revocation.

---

## 3. Authorization & State Machine

### Role Matrix

| Action | Allowed Role | Conditions / Pre-checks | Post-Condition / Failure |
| :--- | :--- | :--- | :--- |
| `revoke()` | `issuer` only | `revocable == true`, `revoked == false`, `msg.sender == issuer` | Transfers `unearned` to issuer; freezes `revocationEarnedAmount`; reverts on unauthorized caller or repeated call |
| `claim()` | `beneficiary` only | `isEligible(beneficiary) == true`, `claimableAmount() > 0` | Transfers `claimableAmount` to beneficiary; callable both before and after revocation |
| `approveMilestone()` | `reviewer` only | `revoked == false`, `msg.sender == reviewer`, milestone unapproved | Reverts with `AlreadyRevoked()` if grant has been revoked |
| `createGrant()` | Any caller (as issuer) | Allocation funded atomically | Sets `revocable` flag in `GrantVault` |

### State Transitions

```
                    +------------------------------------+
                    |        UNREVOKED (Active)          |
                    |  - revocable: true / false         |
                    |  - revoked: false                  |
                    +------------------------------------+
                                      |
                +---------------------+---------------------+
                |                                           |
                | msg.sender == issuer                      | msg.sender != issuer OR
                | revocable == true                         | revocable == false OR
                |                                           | already revoked
                v                                           v
+--------------------------------+           +-----------------------------+
|            REVOKED             |           |           REVERT            |
|  - revoked: true               |           |  UnauthorizedIssuer() /     |
|  - revokedAt: timestamp        |           |  GrantNotRevocable() /      |
|  - revocationEarnedAmount: E   |           |  AlreadyRevoked()           |
|  - unearned transferred out    |           +-----------------------------+
|  - approveMilestone reverts    |
|  - claims allowed up to E      |
+--------------------------------+
```

---

## 4. Edge Cases, Protections & Security

1. **Reentrancy & CEI**:
   - `revoke()` uses OpenZeppelin `ReentrancyGuard` (`nonReentrant`).
   - State variables (`revoked = true`, `revokedAt = block.timestamp`, `revocationEarnedAmount = earned`) are written before ERC20 token transfer to issuer.
2. **Surplus Tokens / Excess Transfers**:
   - Vault balance may exceed `totalAllocation` due to unsolicited ERC20 transfers/donations.
   - Recovery is strictly bounded by contract economics: $\text{unearned} = \text{totalAllocation} - \text{earned}$.
   - Excess tokens remain untouched in vault; issuer recovery never drains funds below the beneficiary's claimable entitlement $(\text{earned} - \text{claimed})$.
3. **Rounding & Conservation**:
   - Linear vesting uses `Math.mulDiv(totalAllocation, elapsed, duration)`.
   - Entitlement conservation is guaranteed: $\text{earned} \ge \text{claimedAmount}$ and $\text{earned} \le \text{totalAllocation}$.
4. **Zero Unearned**:
   - If $\text{earned} == \text{totalAllocation}$, $\text{unearned} = 0$. No transfer is executed, avoiding reverts on zero-value transfers on non-standard ERC20 tokens.
5. **Event Indexing**:
   - `event GrantRevoked(address indexed issuer, uint256 recoveredAmount, uint256 earnedAmount);`
   - Emitted synchronously within `revoke()`.

---

## 5. Backward Compatibility & Old Vault Preservation

1. **Old Deployed Vaults**:
   - Deployed vaults lack `revoke()`, `revocable()`, `revoked()`, and `revokedAt()`.
   - Any external call to `revoke()` on old vaults will revert via Solidity EVM fallback rejection.
   - Off-chain clients and web UI query `revocable` with graceful error catching: if function call reverts, default to `revocable: false`, `revoked: false`, `revokedAt: 0`, `revocationEarnedAmount: 0`.
   - Existing workflows (time claims, reviewer approvals, beneficiary claims) on old vaults remain 100% operational.
2. **New Non-Revocable Grants**:
   - Can be created by setting `config.revocable = false`.
   - Calling `revoke()` on these vaults reverts with `GrantNotRevocable()`.

---

## 6. UI Confirmation Preview Specification

When an issuer views an active, revocable grant:
- **Action**: "Revoke Grant" button displayed only when `wallet.address == issuer`, `revocable == true`, and `!revoked`.
- **Preview Modal / Card**:
  - **Beneficiary Custody (Claimed)**: e.g. "20,000 hvUSD (Preserved in beneficiary wallet)"
  - **Beneficiary Entitlement (Earned Unclaimed)**: e.g. "20,000 hvUSD (Remains claimable by beneficiary)"
  - **Treasury Clawback (Issuer Recovery)**: e.g. "60,000 hvUSD (Returned immediately to issuer)"
  - **Warning**: "Revocation is permanent and irreversible. All unlocked value earned by the beneficiary up to this second is strictly preserved. Unearned tokens return to your connected wallet."
  - **Confirmation Action**: "Confirm Clawback" calls `GrantVault.revoke()`.
- **Post-Revocation Display**:
  - Displays "REVOKED" badge with timestamp.
  - Beneficiary sees "Remaining Claimable Entitlement: X hvUSD" with active "Claim" button if $X > 0$.
  - Reviewer sees milestone controls disabled with explanation: "Grant revoked; milestones locked."

---

## 7. Contract-Level Test Matrix

| Category | Test Case | Target / Function | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Normal** | Revoke TIME grant midway | `revoke()` | Issuer receives `totalAllocation - earned`; beneficiary claims remainder |
| **Normal** | Revoke MILESTONE grant after partial approval | `revoke()` | Issuer receives unapproved milestones; approved milestones claimable |
| **Normal** | Revoke HYBRID grant midway | `revoke()` | Frozen at `min(time, approved)`; unearned returned to issuer |
| **Boundary** | Revoke before start / cliff | `revoke()` | $100\%$ returned to issuer; $0$ to beneficiary |
| **Boundary** | Revoke at $100\%$ vested / earned | `revoke()` | $0$ returned to issuer; $100\%$ remains with beneficiary |
| **Boundary** | Revoke when all earned is already claimed | `revoke()` | Issuer receives unearned; claimable becomes $0$ |
| **Repeated** | Call `revoke()` twice | `revoke()` | First succeeds; second reverts with `AlreadyRevoked()` |
| **Authorization**| Beneficiary calls `revoke()` | `revoke()` | Reverts with `UnauthorizedIssuer()` |
| **Authorization**| Reviewer calls `revoke()` | `revoke()` | Reverts with `UnauthorizedIssuer()` |
| **Authorization**| Stranger calls `revoke()` | `revoke()` | Reverts with `UnauthorizedIssuer()` |
| **Non-revocable**| Issuer calls `revoke()` on non-revocable grant | `revoke()` | Reverts with `GrantNotRevocable()` |
| **Adversarial** | Reviewer approves milestone after revocation | `approveMilestone()` | Reverts with `AlreadyRevoked()` |
| **Adversarial** | Reentrancy during token transfer in `revoke()` | `revoke()` | Blocked by `nonReentrant` |
| **Edge Case** | Vault holds surplus donation tokens | `revoke()` | Only `totalAllocation - earned` returned; surplus left intact |
| **Fuzz/Invariant**| Invariant: Entitlement conservation | Fuzz $(t_{\text{claim}}, t_{\text{rev}})$ | `claimed + claimable + recovered == totalAllocation` |
| **Fuzz/Invariant**| Invariant: Claimed preservation | Fuzz $(t_{\text{claim}}, t_{\text{rev}})$ | Balance of beneficiary never decreases upon revocation |
| **Fuzz/Invariant**| Invariant: One-way state transition | Fuzz timestamps | Once `revoked == true`, state is permanently immutable |
| **Compatibility**| Old vault mock / non-revocable interface | Read getters | Readable, non-revocable, immutable |
