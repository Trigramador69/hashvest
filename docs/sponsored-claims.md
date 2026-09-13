# Sponsored first claims

This document records the HAS-23 research decision and the HAS-24 implementation.
It is the source of truth for organization-sponsored first claims until the
protocol is independently audited.

## Decision

HashVest uses a versioned `SponsoredGrantVault` for grants created inside an
organization. Direct grants continue to use the legacy `GrantVault` and its
beneficiary-paid `claim()` path. Existing vaults are never upgraded in place.

The sponsored path is one exact first claim:

1. The beneficiary opens the organization grant and confirms the amount.
2. The beneficiary signs an EIP-712 `SponsoredClaim` intent.
3. The Cloud verifies the authenticated beneficiary, organization association,
   live HSK state, policy limit, and signature binding.
4. A server-only organization relayer submits `claimWithSignature` and pays
   native HSK gas.
5. The Cloud records the request and receipt state. The beneficiary can use
   the normal wallet-paid claim whenever sponsorship is disabled, unavailable,
   expired, or unsupported.

The signed fields are `vault`, `beneficiary`, exact `amount`, `nonce`,
`deadline`, and the intended `relayer`. The contract also binds the EIP-712
domain to name `HashVest Sponsored Claim`, version `1`, chain `133`, and the
verifying vault address. The contract requires the transaction sender to equal
the signed relayer, checks the current nonce and claimable amount, and marks
the sponsored path used before settling the claim. A legacy manual claim also
consumes the sponsored-first-claim opportunity because `claimedAmount != 0`
blocks later sponsored execution.

## Why this mechanism

The [HSK Developer QuickStart](https://docs.hskchain.net/docs/Developer-QuickStart)
documents HSK Testnet as an EVM network with chain ID `133` and a native HSK
balance required for transaction fees. The [HSK fee documentation](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/Fee)
documents the native transaction fee model. The repository research did not
find an HSK-specific official ERC-4337 bundler or paymaster endpoint to rely
on, so this slice does not assume account abstraction infrastructure.

The extension keeps the smallest auditable surface: a beneficiary signature,
one relayer address, one nonce, one deadline, and an explicit one-time flag.
It does not change vesting or claim math, does not create custodial beneficiary
keys, and does not allow arbitrary server-selected claims. The typed-data
shape follows [EIP-712](https://eips.ethereum.org/EIPS/eip-712).

## Authority and threat model

| Concern                                                                        | Authoritative layer      | Enforcement                                                                      |
| ------------------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------- |
| Beneficiary, claimable amount, claimed amount, balances, nonce, one-time state | HSK                      | `SponsoredGrantVault` reads/checks at the transaction block                      |
| Signature intent and relayer binding                                           | Beneficiary wallet + HSK | EIP-712 recovery and `msg.sender == relayer`                                     |
| Organization opt-in and reservation limit                                      | Cloud/Supabase           | Owner-only Route Handler and transactional reservation function                  |
| Request/receipt visibility and retry state                                     | Cloud/Supabase           | Service-role-only request tables and idempotent `(chain, vault, nonce)` identity |
| Relayer private key                                                            | Server runtime           | `server-only` module and boundary checker; never browser-visible                 |

Compromising Cloud policy or request metadata must not let the server move
funds to another beneficiary or amount: HSK still requires the beneficiary's
signature and the exact signed vault/amount/relayer. Compromising the relayer
key can spend the relayer's HSK and submit valid beneficiary-signed intents,
so it is isolated, funded only for the configured policy budget, and must be
rotated operationally outside this code change if compromised.

The organization limit is reserved before broadcast to prevent concurrent
requests from exceeding policy. A failed request without a transaction can be
retried through the same immutable request; a submitted request is polled by
receipt and is never broadcast again. Reservations are intentionally not
silently refunded by the browser after a relayer failure; an owner can raise
the policy limit while operations investigate the failure.

## Cloud state machine

`requested` is persisted before processing. A database lease moves it to
`processing` and increments attempts. A successful broadcast stores the hash
and moves it to `submitted`; receipt refresh moves it to `confirmed` or
`failed`. A failed request with no hash can be leased again. A request with a
hash is never sent a second time by the HTTP retry path.

The request row stores the signature and exact numeric fields as server data,
but API responses omit the signature. Status reads are scoped to the
authenticated organization member and the associated `(133, vault)` pair.
The owner policy exposes only enabled state, counters, relayer address, and
configuration status.

## Deployment and rollback

`pnpm contracts:sync` includes the new ABI. The sponsorship schema is applied by
[`20260913000000_hashvest_sponsored_claims.sql`](../supabase/migrations/20260913000000_hashvest_sponsored_claims.sql);
the earlier organization migration is historical and must not be edited after
it has been applied. The existing deployment artifact still points to the
previously deployed factory, so organization creation will use
`createSponsoredGrant` only after a new `HashVestFactory` deployment is
authorized and the address artifact is synchronized. This implementation did
not broadcast or redeploy anything. The relayer also needs a server-only
`SPONSORED_CLAIM_RELAYER_PRIVATE_KEY` and enough native HSK for the configured
organization budget.

Rollback is application-safe: stop enabling the organization policy and use
the normal beneficiary-paid claim. Legacy grants and all existing vault state
remain readable. A protocol rollback after deployment means shipping the
previous app build while retaining the old factory address; no existing
vault is mutated.

## Prototype evidence and remaining gate

`packages/contracts/test/SponsoredClaim.t.sol` covers exact binding, wrong
relayer/signature, expiry, nonce, unavailable amount, replay, manual fallback,
and legacy-surface compatibility. The web validation tests cover decimal
uint256 input, signature length, deadline, and organization policy limits.

The safe local Foundry prototype is verified by the focused tests and contract
build. A real HSK end-to-end sponsored claim remains a deployment and funded
relayer operation. It requires explicit broadcast authorization, a fresh
factory address artifact, P0 regression checks, and recording gas payer,
transaction, receipt, beneficiary balance, vault claimed state, and relayer
balance before marking the Linear work complete.
