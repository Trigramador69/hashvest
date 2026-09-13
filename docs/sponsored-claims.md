# Sponsored protocol actions

This document records the HAS-23 research decision, the HAS-24 first-claim
prototype, and the HAS-28 generalization to repeatable claims and reviewer
approvals. It is the source of truth for organization-sponsored protocol
actions until the protocol is independently audited.

## Decision

HashVest uses a versioned `SponsoredGrantVault` for grants created inside an
organization. Direct grants continue to use the legacy `GrantVault` and its
wallet-paid `claim()` / `approveMilestone()` paths. Existing vaults are never
upgraded in place.

HAS-28 extends the signed-intent path beyond a one-time first claim:

1. The beneficiary or reviewer opens the organization grant and confirms the
   exact action (claim amount or milestone index).
2. That actor signs an EIP-712 intent (`SponsoredClaim` or
   `SponsoredMilestoneApproval`).
3. The Cloud verifies the authenticated actor, organization association, live
   HSK state, organization policy, and signature binding.
4. A server-only organization relayer submits `claimWithSignature` or
   `approveMilestoneWithSignature` and pays native HSK gas.
5. The Cloud records the request and an idempotent receipt. The wallet-paid
   action remains available whenever sponsorship is disabled, unavailable,
   expired, unsupported, or over budget.

The signed claim fields are `vault`, `beneficiary`, exact `amount`, `nonce`,
`deadline`, and the intended `relayer`. The signed review fields are `vault`,
`reviewer`, `milestoneIndex`, `nonce`, `deadline`, and `relayer`. The contract
binds the EIP-712 domain to name `HashVest Sponsored Actions`, version `2`,
chain `133`, and the verifying vault address. Separate `sponsoredClaimNonce`
and `sponsoredReviewNonce` counters make the two actions independently
replay-safe. The contract requires `msg.sender` to equal the signed relayer.

Cloud does not sponsor arbitrary wallet transactions. The only relayed calls
are the two protocol functions above. The relayer never chooses beneficiary,
reviewer, amount, milestone, nonce, or claim math.

## Why this mechanism

The [HSK Developer QuickStart](https://docs.hskchain.net/docs/Developer-QuickStart)
documents HSK Testnet as an EVM network with chain ID `133` and a native HSK
balance required for transaction fees. The [HSK fee documentation](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/Fee)
documents the native transaction fee model. The repository research did not
find an HSK-specific official ERC-4337 bundler or paymaster endpoint to rely
on, so this slice does not assume account abstraction infrastructure.

The extension keeps an auditable surface: an actor signature, one relayer
address, one per-action nonce, one deadline, and explicit organization policy.
It does not change vesting or claim math, does not create custodial keys, and
does not allow the server to invent an action the actor did not sign. The
typed-data shape follows [EIP-712](https://eips.ethereum.org/EIPS/eip-712).

## Authority and threat model

| Concern                                                                    | Authoritative layer | Enforcement                                                                                 |
| -------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| Beneficiary, reviewer, claimable amount, approval, balances, nonces        | HSK                 | `SponsoredGrantVault` reads/checks at the transaction block                                 |
| Signature intent and relayer binding                                       | Actor wallet + HSK  | EIP-712 recovery and `msg.sender == relayer`                                                |
| Organization opt-in, vault allowlist, action allowlist, quotas, gas budget | Cloud/Supabase      | Owner-only policy writes and transactional reservation                                      |
| Request/receipt visibility and retry state                                 | Cloud/Supabase      | Service-role-only request tables and idempotent live `(chain, vault, type, nonce)` identity |
| Relayer private key                                                        | Server runtime      | `server-only` module and boundary checker; never browser-visible                            |

Compromising Cloud policy or request metadata must not let the server move
funds to another beneficiary or approve a different milestone: HSK still
requires the actor's signature and the exact signed vault, payload, nonce,
deadline, and relayer. Compromising the relayer key can spend the relayer's
HSK and submit valid signed intents, so it is isolated, funded only for the
configured policy budget, and must be rotated operationally outside this code
change if compromised.

The organization limit and gas budget are reserved before broadcast to prevent
concurrent requests from exceeding policy. A failed request without a
transaction can be retried through the same immutable request. A submitted
request is polled by receipt and is never broadcast again. Daily wallet limits
still count abandoned rows so an actor cannot refill the day by waiting for
expiry. Expired unused intents release the reserved gas and the action slot so
the still-valid on-chain nonce can be reserved again with a new signature.

## Organization policy

Policies start disabled. An owner must enable sponsorship, choose `claim`
and/or `review`, allowlist associated vaults, set a lifetime action limit, set
a per-wallet UTC daily limit, and set a native HSK gas budget. Members can
read usage and remaining limits; only an owner can change or disable the
policy. The gas payer is the configured relayer address, never the actor
wallet and never HashVest custody.

## Cloud state machine

`requested` is persisted before processing. A database lease moves it to
`processing` and increments attempts. A successful broadcast stores the hash
and moves it to `submitted`; receipt refresh moves it to `confirmed` or
`failed`. A failed request with no hash can be leased again by an explicit
retry. A request with a hash is never sent a second time.

A `processing` lease that is older than two minutes and still has no hash can
be reclaimed. Status reads recover `requested` and stale `processing` rows;
they do not auto-retry a `failed` row without a user retry. Expired unsigned
broadcasts become `abandoned` and are excluded from the live unique nonce
index so the same on-chain nonce can be reserved again.

The request row stores the signature and exact numeric fields as server data,
but API responses omit the signature. Status reads are scoped to the
authenticated organization member and the associated `(133, vault)` pair.
The policy response exposes enabled state, allowlists, counters, gas
spent/reserved/remaining, relayer address, and configuration status.

## Costs and failure modes

These costs are real and are not hidden behind product-model language:

- The relayer pays native HSK gas. The Cloud estimates `1.25 × gas × 2 × gasPrice`
  before reserve. Actual settlement records `gasUsed × effectiveGasPrice`.
  If actual cost exceeds the estimate, the receipt still records the true
  spend; the budget check is enforced at reserve time, not by rewriting the
  receipt.
- A disabled policy, missing vault allowlist, exhausted action limit, daily
  wallet limit, or exhausted gas budget rejects the request. The wallet-paid
  path remains.
- Relayer insufficient funds, RPC/network failure, or a simulation revert
  marks the request `failed` without a hash when nothing was broadcast. The
  same signed intent can be retried before expiry.
- A broadcast that later reverts still spent relayer gas. That spend is
  recorded. The on-chain nonce is unchanged if the transaction reverted, and
  the wallet-paid path remains.
- An expired unused intent is abandoned. Gas reservation and the action slot
  are released. The actor must sign again; Cloud does not reuse an expired
  signature.
- Legacy `GrantVault`s and the current checked-in factory do not expose the
  v2 sponsored-action surface. Those grants stay on the wallet-paid path.

Sponsorship is not a custody, payout, or automatic financial-decision feature.
It only pays gas for an actor-signed protocol call.

## Deployment and rollback

`pnpm contracts:sync` includes the new ABI. The first-claim prototype schema
remains in
[`20260913000000_hashvest_sponsored_claims.sql`](../supabase/migrations/20260913000000_hashvest_sponsored_claims.sql)
and is not mutated. HAS-28 adds
[`20260913040000_hashvest_sponsored_actions.sql`](../supabase/migrations/20260913040000_hashvest_sponsored_actions.sql)
for policy, budgets, allowlists, rate limits, and action receipts. The
existing deployment artifact still points to the previously deployed factory,
so organization creation will use `createSponsoredGrant` only after a new
`HashVestFactory` deployment is authorized and the address artifact is
synchronized. This implementation did not broadcast or redeploy anything. The
relayer also needs a server-only `SPONSORED_CLAIM_RELAYER_PRIVATE_KEY` and
enough native HSK for the configured organization budget.

Rollback is application-safe: disable the organization policy and use the
normal wallet-paid claim or approval. Legacy grants and all existing vault
state remain readable. A protocol rollback after deployment means shipping the
previous app build while retaining the old factory address; no existing vault
is mutated.

## Prototype evidence and remaining gate

`packages/contracts/test/SponsoredClaim.t.sol` covers exact binding, wrong
relayer/signature, expiry, nonce, unavailable amount, replay, revoked and
already-approved reviews, independent claim/review nonces, manual fallback,
and legacy-surface compatibility. Cloud tests cover decimal uint256 input,
signature length, deadline bounds, policy allowlists and budgets, reserve
error mapping, replay binding, relayer failure classification, stale-lease
recovery, and the closed-RLS migration posture.

The safe local Foundry prototype is verified by the focused tests and contract
build. A real HSK end-to-end sponsored claim or review remains a deployment
and funded-relayer operation. It requires explicit broadcast authorization, a
fresh factory address artifact, P0 regression checks, and recording gas payer,
transaction, receipt, actor balances, vault state, and relayer balance before
marking live testnet evidence complete.
