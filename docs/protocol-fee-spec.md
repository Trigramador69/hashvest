# HashVest Protocol Fee: Economic and Security Design (HAS-40)

This document is the source of truth for a transparent, optional HashVest
protocol fee. It records the HAS-40 research decision and the contract test
plan. It does **not** authorize implementation, factory changes, or any HSK
deployment.

HAS-5 remains the authority rule: **HSK is authoritative for value and
permission; Supabase is product context; Protocol must never depend on Cloud.**
A later implementation still needs a separate protocol, security, and economic
review before any bytecode change is approved.

## 1. Problem and decision

The open protocol may eventually fund shared infrastructure through a small
create-time fee in the grant token. The fee must not reduce the beneficiary
allocation, hide inside Cloud metadata, or destabilize the current zero-fee
HSK bootstrap.

**Decision.** If a fee is ever enabled, the issuer pays a surplus at
`createGrant` / `createSponsoredGrant`. `GrantConfig.totalAllocation` stays
the exact vault allocation. The current ownerless factory and every already
deployed vault remain the zero-fee path.

**Optional** means the protocol can run at `0` bps, not that each issuer can
decline a nonzero factory rate. The bootstrap waiver is `feeBps = 0`. A later
owner-managed issuer allowlist may waive a nonzero rate. Issuers cannot pass a
per-transaction skip flag.

## 2. Authority

| Field or operation                                      | Owner                         | Not owner                              |
| ------------------------------------------------------- | ----------------------------- | -------------------------------------- |
| Vault `totalAllocation`, milestones, claims, revocation | HSK / `GrantVault`            | Cloud, factory admin, treasury         |
| Create-time fee amount, rate, treasury, waiver          | HSK / future factory          | Cloud, `/plans`, organization metadata |
| Display of the quote before signing                     | Live factory view + wallet UI | Cached Cloud copy                      |
| SaaS plans, add-ons, entitlements                       | Cloud presentation only       | Protocol                               |
| Fee enablement or factory redeploy                      | Explicit later approval       | This document                          |

`GrantVault` and `SponsoredGrantVault` do not learn about a fee. Vesting,
milestone sums, `claim()`, `claimWithSignature`, and `revoke()` continue to
use `totalAllocation` only. A revoked grant returns unearned allocation to
the issuer and does **not** refund the protocol fee.

Cloud may render the factory quote. It must not invent, cache as
authoritative, or invoice a different amount. A protocol fee is not a SaaS
price, tax, or entitlement.

## 3. Canonical accounting

Given:

- `totalAllocation`: 100,000 tokens
- `feeBps`: 10 (0.10%)

Then:

1. `fee = floor(100,000 × 10 / 10,000) = 100`
2. Issuer provides **100,100** tokens in the create transaction.
3. Vault balance increase is **100,000**. `totalAllocation` is **100,000**.
4. Configured treasury receives **100**.
5. Conservation:

   ```text
   issuerDebit = totalAllocation + fee
   vaultAllocation + treasuryFee = issuerDebit
   100,000 + 100 = 100,100
   ```

The beneficiary can never claim the 100-token fee. Reviewers, eligibility
adapters, and sponsored first-claim signatures still bind vault amounts only.

## 4. Math, range, and rounding

```text
MAX_FEE_BPS = 25          // 0.25%
feeBps      ∈ [0, 25]
fee         = floor(totalAllocation * feeBps / 10_000)
totalDebit  = totalAllocation + fee
```

Use the same overflow-safe `mulDiv` pattern `GrantVault` already uses for
vesting. Do not convert to USD. Do not charge native HSK as the protocol fee.

| Allocation | `feeBps` | Fee | Issuer debit | Notes                          |
| ---------- | -------- | --- | ------------ | ------------------------------ |
| 100,000    | 0        | 0   | 100,000      | Required bootstrap             |
| 100,000    | 5        | 50  | 100,050      | Low end of the evaluated range |
| 100,000    | 10       | 100 | 100,100      | Canonical example              |
| 100,000    | 25       | 250 | 100,250      | Hard cap                       |
| 99         | 25       | 0   | 99           | Dust floors to zero            |
| 1          | 10       | 0   | 1            | No 1-wei minimum fee           |

The evaluated product range is about 0.05%–0.25% (5–25 bps). The onchain
domain is `[0, 25]` so bootstrap `0` and later 1–4 bps remain legal. A value
above 25 bps must revert.

**Range evaluation.** 5 bps (0.05%) is large enough to be visible on a
100,000-token grant (50 tokens) and small enough that it does not change
issuer budgeting the way a 1%+ take would. 10 bps is the canonical example
because it matches the HAS-40 100,100 / 100,000 / 100 story and sits in the
middle of that band. 25 bps (0.25%) is the hard cap: enough to fund shared
infrastructure later, not enough to look like a hidden haircut or to tempt
taking the fee from allocation. 1–4 bps stay legal so a later review can
step up from zero without a bytecode change, but they are not the intended
product default. Rates above 25 bps would start to matter on large grants
and would need a new factory plus a new review.

Flooring dust to zero is accepted. Do not pad a nonzero minimum that would
surprise small grants or change exact allocation math. A 99-token grant at
the cap pays nothing; the alternative (forcing 1 token) would make the
beneficiary allocation and the issuer debit diverge from a readable
percentage for no infrastructure gain.

## 5. Create-time flow

The current `HashVestFactory._createGrant` deploys a vault, then
`safeTransferFrom`s exactly `config.totalAllocation` into it, then reverts
`UnderfundedGrant` unless the vault balance increased by at least that
amount. A future fee-aware factory keeps that path and adds a second leg.

Recommended order inside the existing `nonReentrant` create:

1. Read `feeBps`, `treasury`, and `isFeeWaived(msg.sender)` once.
2. Compute `fee`. If waived or `feeBps == 0`, `fee = 0`.
3. Recommended bind: require the caller-supplied expected quote to match
   (`expectedFee`, `expectedFeeBps`, and `expectedTreasury`). Mismatch
   reverts. Exact `totalDebit` allowance is the weaker fallback if a later
   review rejects extra create arguments. Either way, a higher mined rate
   must not silently succeed.
4. Deploy `GrantVault` or `SponsoredGrantVault` with the unchanged
   `GrantConfig`.
5. Reject `treasury == vault` so the fee cannot land as a vault surplus.
6. Transfer `totalAllocation` to the vault and keep the current balance-delta
   check.
7. If `fee > 0`, transfer `fee` to `treasury` and apply the same
   SafeERC20 + balance-delta check on that leg.
8. Emit `GrantCreated` as today, plus `ProtocolFeeCollected` when `fee > 0`.

Failure of either transfer reverts the whole transaction. A vault is never
left deployed without its exact allocation, and a fee is never taken without
a vault.

Both `createGrant` and `createSponsoredGrant` use this path. Cohort creation
stays Cloud orchestration of individual creates. The live zero-fee factory
keeps today's `Σ allocations` check; a later fee-aware factory updates that
sum as recorded in [`cohort-distribution-spec.md`](cohort-distribution-spec.md).

## 6. Configuration, bootstrap, and waivers

The live factory at this writing is ownerless and has no fee storage. That is
the required HSK bootstrap. Do not retrofit an admin onto the already
deployed factory.

A future factory may add:

| Item               | Rule                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `MAX_FEE_BPS`      | Immutable `25`                                                                               |
| `feeBps`           | Mutable, `<= MAX_FEE_BPS`, default `0`                                                       |
| `treasury`         | Mutable; `address(0)` is valid only while `feeBps == 0`                                      |
| Fee admin          | New trust assumption. Prefer two-step ownership plus a timelock before any nonzero live rate |
| `setFeeConfig`     | Admin only; emit previous and next rate/treasury                                             |
| `setFeeWaiver`     | Admin only; per-issuer allowlist; emit the issuer and waived flag                            |
| Global waiver      | `feeBps = 0`                                                                                 |
| Issuer self-waiver | Forbidden                                                                                    |

Changing config after a user saw a quote is a known threat. The recommended
expected-quote bind, or at least an exact `totalDebit` allowance, is the
user-side guard. Unlimited ERC20 allowance across a config change is unsafe
and must be documented.

A treasury that is the issuer is allowed and economically pointless. It is
not a waiver.

## 7. Token and failure safety

Grant tokens remain normal ERC20s. Native HSK, fee-on-transfer, rebasing, and
tokens that do not increase the recipient balance by the requested amount
stay unsupported.

Apply the existing funding invariant to **both** legs:

```text
afterBalance - beforeBalance >= requestedAmount
```

A token that takes a hidden fee on the treasury transfer must revert the
create, just as `FeeToken` already reverts vault funding in
`packages/contracts/test/HashVest.t.sol` and
`packages/contracts/test/Adversarial.t.sol`.

Reentrancy follows the current factory `nonReentrant` guard and the
callback-token cases already covered for funding and claim. The fee leg is a
new callback surface: a malicious treasury or token hook must not create a
second grant, change config, or observe a half-funded vault.

## 8. Display before signing

On the live factory there is no protocol fee. Wizard and cohort Review
continue to show beneficiary `totalAllocation` only. That allocation must
stay independently visible as the vault amount, never mixed with a Cloud
surcharge.

When a fee-aware factory exists, the protocol view is the source of truth,
for example `quoteCreateCost(issuer, allocation)` returning allocation, fee,
total debit, `feeBps`, treasury, and waived. Alternative frontends must be
able to compute the same numbers without Cloud.

When a fee-aware factory exists, the wizard Review step and cohort review
must show, from that live quote, before approve or create:

- beneficiary allocation (`totalAllocation`)
- protocol fee amount
- issuer total debit
- `feeBps` and the percent form
- treasury address
- waiver state, when it changes the debit

Wallet simulation will show one or two token movements. The UI must not
label the fee as part of the beneficiary allocation. Localized copy may
explain the surplus; the numeric values stay technical literals through
placeholder substitution.

`/plans` and the landing catalog stay presentation-only. They must not
describe the protocol fee as a Cloud price or an enforced plan limit.

## 9. Compatibility

| Surface                        | Required behavior                                               |
| ------------------------------ | --------------------------------------------------------------- |
| Current `HashVestFactory`      | Unchanged zero-fee create; no admin                             |
| Existing `GrantVault`s         | No new storage; allocation, claims, and revocation unchanged    |
| `SponsoredGrantVault`          | Signed claim fields stay vault/amount/relayer; no fee field     |
| Direct `/grants/new`           | Continues to fund exactly `totalAllocation` on the live factory |
| Organization sponsored creates | Same, until a separately approved factory is deployed           |
| Cloud metadata                 | Never a substitute for the onchain quote                        |

A fee-aware factory is a new deployment, not an in-place upgrade. Old vaults
created through the current factory remain valid and readable.

## 10. Threat model

| Threat                                       | Why it matters                                                | Mitigation                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Hidden fee taken from allocation             | Beneficiary receives less than the promised grant             | Vault is funded with `totalAllocation` only; fee is a separate surplus                         |
| Fee-on-claim or USD conversion               | Changes unlock math; hides cost from the issuer               | Forbidden. Create-time grant-token surplus only                                                |
| Cloud-only or `/plans` fee                   | Cloud could invent a charge HSK does not enforce              | Quote is a factory view; Cloud display is non-authoritative                                    |
| Malicious `treasury` (EOA theft, token sink) | Issuer surplus is stolen or burned                            | Admin/timelock, events, expected-treasury bind, `treasury != 0` when `feeBps > 0`              |
| `treasury == vault`                          | Fee becomes an undeclared vault surplus                       | Revert                                                                                         |
| Sudden `feeBps` increase after the UI quote  | User signs a larger debit than reviewed                       | Expected-quote bind; exact allowance; cap 25 bps; timelock before live nonzero rates           |
| Waiver forgery                               | Issuer skips a nonzero rate without admin consent             | No caller-set skip flag; only admin allowlist or global `0`                                    |
| Fee-on-transfer / rebasing token             | Vault or treasury underfunded while create appears to succeed | Balance-delta checks on both legs; existing `FeeToken` tests remain the pattern                |
| ERC20 / ERC777 callback reentrancy           | Second create, config change, or double collection            | Factory `nonReentrant`; extend callback-token tests to the fee leg                             |
| Rounding grief                               | Tiny grants overcharged or allocations adjusted               | Floor only; no 1-wei minimum; allocation stays exact                                           |
| Revoke-as-refund                             | Issuer tries to recover the protocol fee                      | `revoke()` returns unearned allocation only                                                    |
| Compromised Cloud                            | False fee shown, or metadata invoice                          | Wallet reads the factory; create reverts if the bound quote does not match                     |
| Compromised fee admin                        | Rate or treasury redirected                                   | Cap, two-step owner, timelock, events; still a residual admin-key risk that review must accept |

The residual risk of a live admin key is why this design stays
implementation-blocked until a separate review. Adding ownership to the
factory is a new trust assumption the current bootstrap does not have.

## 11. Alternatives rejected

| Alternative                           | Why rejected                                                    |
| ------------------------------------- | --------------------------------------------------------------- |
| Deduct the fee from `totalAllocation` | Violates exact beneficiary allocation                           |
| Fee-on-claim                          | Hidden from the issuer; changes claim math; can strand dust     |
| USD or stable-unit fee                | Protocol has no price oracle and must not assume one            |
| Cloud invoice / SaaS entitlement      | Crosses the HAS-5 and HAS-36 boundaries                         |
| Per-create issuer opt-out             | Cannot fund infrastructure once a nonzero rate is intended      |
| Admin on the already deployed factory | Changes the live ownerless trust model without a new deployment |
| Minimum 1-token fee                   | Breaks dust grants and the “allocation stays exact” story       |

## 12. Contract test plan

Specify now. Do not add these tests until an implementation is separately
approved. Prefer a dedicated `packages/contracts/test/ProtocolFee.t.sol`
plus extensions to `HashVest.t.sol`, `Adversarial.t.sol`,
`SponsoredClaim.t.sol`, and `Fuzz.t.sol`, reusing `HashVestTestBase`,
`FeeToken`, and `CallbackToken`.

| Category      | Case                                                       | Expected outcome                                                                               |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Bootstrap     | `feeBps = 0` on `createGrant`                              | Vault funded with exact allocation; treasury unchanged; no fee event                           |
| Bootstrap     | Current factory ABI / ownerless factory                    | Existing tests keep passing with no fee arguments                                              |
| Canonical     | 100,000 allocation, 10 bps                                 | Issuer debit 100,100; vault 100,000; treasury 100                                              |
| Range         | 5 bps and 25 bps on 100,000                                | Fees 50 and 250; allocation unchanged                                                          |
| Cap           | `setFeeConfig(26, treasury)`                               | Revert                                                                                         |
| Rounding      | Allocation 99 at 25 bps                                    | Fee 0; create succeeds; treasury unchanged                                                     |
| Waiver        | Nonzero `feeBps`, waived issuer                            | Fee 0; allocation funded exactly                                                               |
| Waiver        | Non-waived issuer cannot self-skip                         | Create without matching nonzero quote reverts                                                  |
| Quote bind    | `expectedFee` / treasury / bps mismatch                    | Revert; no vault                                                                               |
| Config        | `treasury = 0` while `feeBps > 0`                          | Revert                                                                                         |
| Config        | `treasury == vault`                                        | Revert                                                                                         |
| Token         | `FeeToken` on the vault leg                                | `UnderfundedGrant` or equivalent; issuer balance restored                                      |
| Token         | `FeeToken` on the treasury leg                             | Whole create reverts; no vault; issuer balance restored                                        |
| Token         | `FailingTransferToken` on the fee leg                      | Whole create reverts                                                                           |
| Reentrancy    | `CallbackToken` during fee transfer                        | Guarded; no second grant; no config mutation                                                   |
| Paths         | `createSponsoredGrant` with 10 bps                         | Same surplus accounting; sponsored claim fields unchanged                                      |
| Paths         | Direct `createGrant` after a config change                 | Uses the new quote; old vaults unchanged                                                       |
| Compatibility | Pre-fee vault reads, claim, revoke                         | Allocation, earned, and recovered amounts ignore any later factory fee                         |
| Revocation    | Revoke a fee-era revocable grant                           | Recovered `totalAllocation - earned`; treasury keeps the fee                                   |
| Authorization | Non-admin `setFeeConfig` / `setFeeWaiver`                  | Revert                                                                                         |
| Events        | Successful nonzero fee                                     | `ProtocolFeeCollected` and `GrantCreated` both fire                                            |
| Fuzz          | Random allocation in `(1, uint128.max)` and `feeBps 0..25` | `vaultDelta == allocation`; `treasuryDelta == floor(allocation * bps / 10_000)` or 0 if waived |
| Invariant     | `issuerDebit == allocation + fee`                          | Always                                                                                         |
| Invariant     | Vault `totalAllocation` equals funded allocation           | Always                                                                                         |

Web and locale work is out of this issue. A later UI slice must bind Review
and cohort allowance checks to `quoteCreateCost` and keep technical literals
out of translated strings.

## 13. Deployment gate

This design is complete when the document, architecture pointers, and agent
references are reviewed. It is **not** complete as a protocol change.

Do not:

- edit `HashVestFactory`, `GrantVault`, or `GrantTypes` for a fee
- add Ownable or fee storage to the live factory
- run `pnpm contracts:deploy:testnet` or otherwise broadcast a fee-aware factory
- sync a new factory address for this issue
- add prices, checkout, or entitlements to `/plans`

A later issue may implement the factory quote, expected-quote bind, tests
above, and wizard/cohort display. That issue still needs an explicit
implementation approval, an authorized deploy if bytecode is shipped to HSK,
and the separate protocol/security/economic review named by HAS-40.
