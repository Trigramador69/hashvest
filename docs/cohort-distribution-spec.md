# Cohort Distribution & Bounded Batch Grant Creation (HAS-27)

## Problem Statement

Organizations need to distribute token grants to contributor cohorts (e.g. founding contributors, advisor cohorts, hackathon winners) without repeating fragile manual wizard flows and approvals for every individual contributor.

## Evaluation: Protocol Bounded Batch vs. Cloud Orchestration

The user story calls for evaluating the safest bounded approach:
1. **Onchain Solidity batch entry point** (`HashVestFactory.createGrantBatch(...)`)
2. **Cloud orchestration** of individual existing Factory calls

### Comparative Analysis

| Dimension | Onchain Solidity Batch | Cloud Orchestration (Selected) |
| :--- | :--- | :--- |
| **Protocol Modification** | Requires new factory contract deployment or upgrade. | **Zero protocol changes**; uses audited, deployed `HashVestFactory.createGrant`. |
| **Gas Consumption** | Deploying `new GrantVault` costs ~1.3M–1.5M gas per vault. A batch of 10 would require **~13M–15M gas**, approaching EVM/HSK block limits and risking out-of-gas reverts. | **Predictable gas**: each grant is an independent ~1.3M gas transaction. Zero block limit risk. |
| **Partial Failure & Recovery** | **All-or-nothing**: If recipient 7 of 10 fails (e.g., fee-on-transfer token behavior, invalid provider, out of gas), the entire batch reverts, wasting all consumed gas. | **Granular partial recovery**: If grant 2 fails, grant 1 remains confirmed onchain. Grant 2 can be retried individually without duplicating grant 1. |
| **Token Approvals** | Requires single large allowance; if batch fails, allowance remains hanging. | Single combined allowance covers the batch, or per-grant allowance with safe resets. |
| **Transaction & Explorer Evidence** | Single batch transaction emits multiple events; harder to trace individual vault deployment receipts in basic explorers. | **Clean 1:1 evidence**: Each grant has its own transaction hash, block receipt, and vault contract address directly linkable to HSK explorer. |
| **Idempotency & Duplicate Prevention** | Difficult to guarantee idempotency on retry without onchain nonce/key tracking mappings. | **Strict client-side idempotency**: already-confirmed rows are excluded from retry calls. |
| **Authority Boundaries** | Onchain truth. | **Onchain truth preserved**: Each created vault is an independent, authoritative `GrantVault`. Supabase only tracks organization linkage metadata. |

### Architectural Decision
**Selected Approach**: **Cloud Orchestration of individual `HashVestFactory.createGrant` calls**.
This follows the explicit repository guideline: *"Prefer Cloud orchestration if it delivers the use case without a protocol change."*

---

## Bounded Batch Specification

### Bounds & Limits
- **Minimum cohort size**: `2` contributors (single contributor uses the standard single-grant wizard).
- **Maximum cohort size**: `10` contributors (bounded to ensure reliable browser execution, predictable session management, and clear reviewability).
- **Max total allocation**: Bounded by user's actual token balance at creation time.

### Pre-Broadcast Validation Rules
All rows must be validated before any transaction is broadcast:
1. **Address Validity**: Every beneficiary must be a valid, checksummed, non-zero EVM address.
2. **Distinct Beneficiaries**: No duplicate beneficiary addresses within the same cohort.
3. **Allocation Validity**: Every allocation must be positive and within token decimal precision.
4. **Funding Sufficiency**: Total cohort allocation ($\sum \text{allocations}$) must be $\le \text{issuer balance}$.
5. **Strategy Uniformity**: Cohort shares token, strategy (`TIME`, `MILESTONE`, `HYBRID`), timing schedule (start, cliff, duration), and revocability terms.

### Execution & Retry Semantics
1. **Combined Token Approval**:
   - Current factory allowance is checked against $\sum \text{allocations}$.
   - If insufficient, a single `approve(factory, totalCohortAllocation)` is requested.
2. **Sequenced Creation**:
   - Each grant is created individually via `factory.createGrant(config, milestones)`.
   - On confirmation, the vault address and transaction hash are recorded.
   - If organization context is present, `useLinkOrganizationGrant` links the vault to organization metadata.
3. **Partial Failure & Safe Retry**:
   - If grant $i$ fails (RPC timeout, user rejection, or execution revert), execution halts.
   - Previous grants $1 \dots i-1$ remain permanently confirmed onchain.
   - The user sees a clear status table with a **Retry** button targeting only failed/uncreated rows.
   - Retries are idempotent: confirmed rows are skipped automatically.
