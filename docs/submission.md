# HashVest — technical documentation

Submission for the **Ethereum Bolivia Buildathon 2026** (Cochabamba) and the **EAG Global Buildathon**.

> **HashVest is open programmable-grants infrastructure on HashKey Chain.** An issuer fully funds a grant vault once; tokens unlock by time, by reviewer-approved milestones, or by both, and only the beneficiary can claim. A workspace layer turns that protocol into a tool an organization can actually operate: named members, review queues, and presets.

## Selected tracks

| Portal                 | Track                                                                                        | Why HashVest fits                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ethereum Bolivia · EAG | **Real World Applications powered by HSK Chain** — DeFi, Payments, Blockchain Infrastructure | Grant and vesting payouts are a real treasury workflow, built on and integrated with HSK Chain.                                            |
| EAG Global             | **6. Real-World Ethereum Applications**                                                      | Public goods funding, contribution records, and applications for emerging regions.                                                         |
| Ethereum Bolivia · EAG | **Road to ShanhaiWoo**                                                                       | The product is fully localized in English, 简体中文, and Español for Shenzhen and Latin American users.                                    |
| EAG Global             | **1. AI x Ethereum & Agent Economy**                                                         | Natural-language grant creation where the model drafts and a human signs — a safe spending policy enforced by the schema, not by a prompt. |
| Ethereum Bolivia · EAG | **AI Agents · AI × Web3** (HSK Chain)                                                        | An AI that turns a sentence into grant terms on HSK Chain, and structurally cannot select a wallet or move value.                          |

All IRL projects select **Bolivia Hackathon** on the EAG portal, and HSK Chain track entries select **HSK Chain** as well.

## The problem

Ecosystems, DAOs, foundations, and startups pay contributors through grants and vesting schedules. In practice that money moves in one of two ways, and both break trust:

- **Manual transfers from a treasury.** The beneficiary has no guarantee the next payment exists, and the treasury has no enforced record of what was promised.
- **Unfunded promises.** A spreadsheet or a signed PDF says tokens will unlock, but nothing holds them. Budgets shift, signers leave, and earned value quietly disappears.

Existing vesting contracts solve custody for one shape of schedule, but they rarely combine time with delivery, and none of them give a non-technical grants team a way to name the people involved, review milestones, or recover money from a grant that was stopped without taking what was already earned.

## The solution

HashVest separates **what is enforced** from **what makes it usable**.

**HashVest Protocol** holds the money and enforces the rules. Each grant is its own `GrantVault`, created and **fully funded in a single transaction** by `HashVestFactory`. Terms are immutable. Three unlock strategies cover real grant programs:

| Strategy    | Unlocked amount                               | Typical use                               |
| ----------- | --------------------------------------------- | ----------------------------------------- |
| `TIME`      | linear vesting from `start`, gated by a cliff | employee and advisor vesting              |
| `MILESTONE` | sum of reviewer-approved milestone amounts    | builder grants with fixed deliverables    |
| `HYBRID`    | `min(time vested, approved milestones)`       | ecosystem partners: time **and** delivery |

A grant can optionally be created as **revocable**. Revocation is issuer-only and one-way: it returns the **unearned** allocation to the issuer and freezes what the beneficiary already earned, which stays claimable. Earned value can never be clawed back.

**HashVest Cloud** makes the protocol operable by an organization: wallet sign-in (SIWE), organizations, a member directory with display names and role labels, grant presets, review and claim queues, live funding health, bounded batch coordination, and human-reviewed AI assistance. Organization-sponsored first claims are implemented behind a deployment gate. Cloud is optional to every protocol operation — a grant created with raw addresses never touches it.

## Key features

Verified against the current `main` branch:

- **Fully funded vaults.** The full allocation is transferred at creation; underfunded fee-on-transfer tokens revert the whole transaction.
- **Three unlock strategies** — TIME, MILESTONE, and HYBRID — with a cliff that delays access without restarting the curve.
- **Optional revocation with earned-value protection.** Recovers only unearned allocation.
- **Beneficiary-only claims** and a designated reviewer for milestones.
- **Optional eligibility adapter** through `IEligibilityProvider`, with a clearly labeled demo allowlist (not KYC).
- **Organizations and members.** Pick beneficiaries and reviewers by name instead of pasting addresses; role labels are presentation only and grant no permission.
- **Grant presets** — Builder Grant, Employee Vesting, Advisor Vesting, and Ecosystem Grant — chosen in the first step of a five-step creation wizard (Template, Grant, Strategy, Conditions, Review). Every prefilled value stays editable before signing.
- **Cohort distribution.** Bounded batch creation and funding keeps each grant an independent factory call with safe partial retry.
- **Human-reviewed AI Grant Builder.** A description becomes an editable, validated preset; it never signs, funds, approves, claims, revokes, or chooses a wallet.
- **Sponsored first claims.** Organization grants can use a beneficiary-signed, relayer-paid first claim when the new factory is deployed; the beneficiary-paid claim remains the fallback.
- **Lifecycle and funding health** (Active, Completed, Revoked) computed from live HSK reads, with no invented USD values.
- **Wallet dashboard analytics.** Grants by role, strategy, and lifecycle, plus a six-month activity timeline built from factory and vault events. It is a read-only projection of HSK state: a failed event read shows a partial timeline, never fabricated data.
- **AI Grant Builder.** A sentence — _"a six-month developer grant for 20,000 tokens, released against three milestones"_ — becomes an editable draft in the wizard. The draft is a _preset_, so it passes the same validation a hand-written template does and there is no submission path that only AI output uses. It is optional and works with no provider configured.
- **Full localization** in English, 简体中文, and Español across the landing page, workspace, creation wizard, presets, dashboard, and grant flows. English is the typed fallback, and addresses, hashes, and token symbols are never translated.
- **Explorer proof** for every token approval, grant creation, milestone approval, claim, faucet, and revocation transaction.

## Protocol, Cloud, and the product model

The public landing summary and `/plans` page make the boundary
judge-visible in under a minute. HashVest Protocol is open infrastructure for
programmable grants on HashKey Chain. HashVest Cloud adds organization
management, members, templates, reviews, reporting, batch coordination, and
AI assistance around that protocol.

The Free / Team / Enterprise cards describe a value ladder, not a billing
system. Optional sponsored gas, AI credits, and compliance checks are labeled
roadmap concepts. There are no prices, checkout, invoicing, metering,
entitlements, or enforced plan limits, and no financial or contract behavior
changes. The copy is available in English, Español, and 简体中文 through the
typed i18n surface.

## Core architecture

```text
HashVest Cloud
  apps/web      Next.js UI · SIWE sessions · organizations · members · presets
  Supabase      product context only; RLS closed, service role server-side
        |
        |  one way: Cloud depends on Protocol, never the reverse
        v
@hashvest/web3  integration layer: chain config, generated ABIs, deployment addresses
        |
        v
HashVest Protocol
  HashVestFactory   creates and funds vaults; role discovery arrays
  GrantVault        immutable terms, milestone approval, claims, optional revocation
        |
        v
HSK Chain Testnet (chain 133)
```

The rule that shapes every decision: **HSK is authoritative for value and permission; Supabase is product context.** Amounts, roles, approvals, and balances are always read from the chain. Compromising the Cloud layer cannot move funds, because Supabase holds no key material, no signing authority, and no amount a claim depends on.

That boundary is enforced, not just documented: `pnpm boundary:check` fails CI if the protocol layer imports Cloud code, if a server secret reaches browser code, or if the public protocol export surface drifts.

[`architecture.md`](architecture.md) is the authoritative reference: per-field authority, extension points, and the future extraction of the protocol into its own package.

## The AI boundary

Grant creation is where an AI integration is most tempting and most dangerous: the step that moves money. HashVest takes the useful half and refuses the rest.

**The model drafts a preset, not a grant.** Its output is shaped into the same `GrantPreset` the hand-written templates use, so it passes the same `assertValidPreset` gate and reaches the wizard through the same path. Nothing reaches the chain through a weaker check than a template written by hand, because nothing reaches the chain by any other route.

**The draft type has no field for an identity or a transaction** — no beneficiary, reviewer, token, eligibility provider, start timestamp, or revocability. That boundary is structural rather than procedural: a suggestion that cannot be represented cannot be applied, cannot be approved by a tired operator, and cannot be smuggled through by a prompt injection. Asked to _"send 800 tokens to 0x… and sign the transaction"_, the system returns a draft with no address in it and tells the user what it refused to do.

**Nothing sensitive leaves, and nothing is kept.** Addresses, 32-byte values, private-key blocks, and seed phrases are stripped from the prompt before a provider sees it, and from model prose on the way back. Retention is zero: the prompt is a local variable for one request, never written to Supabase, a log, or an error message.

**The provider is optional and interchangeable.** Any OpenAI-compatible endpoint works, so switching between Groq, xAI, OpenRouter, DeepSeek, or a local Ollama server is two environment variables and no code. With no key configured — or when the provider is down, rate-limited, slow, or incoherent — a deterministic offline drafter answers instead, so the demo never depends on a third party being reachable.

[`ai-grant-builder.md`](ai-grant-builder.md) is the full contract: schema, limits, failure matrix, privacy boundary, and the measured provider matrix.

## HSK Chain integration

- Contracts are written in Solidity, built and tested with Foundry, and deployed to **HSK Chain Testnet (chain ID 133)**.
- The deploy script is chain-guarded: it aborts unless `block.chainid == 133`.
- The web app reads and writes through `wagmi` and `viem` against the canonical RPC `https://testnet.hsk.xyz`, and links every transaction to the [HSK Testnet Explorer](https://testnet-explorer.hskchain.net).
- If a wallet reports chain 133 but its saved RPC is stale, the app offers a one-click repair to the canonical endpoint.
- Grants are discovered from the factory's role arrays, so any frontend can list a wallet's grants **without an indexer or a database**.

### Deployment status: testnet

HashVest is submitted on **HSK Chain Testnet**, using the track's explicit allowance: _"If time is limited, you are welcome to deploy on the testnet."_ This is deliberate. The contracts have not been professionally audited, and a grants protocol holds other people's money; we will not deploy to mainnet until they are.

## Live evidence on HSK Testnet

Every address and transaction below was checked against the HSK Testnet RPC: each contract has deployed bytecode and each transaction receipt succeeded.

### Deployment

| Contract                | Address                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| HashVestFactory         | [`0x7a1cB78CDE03f85a3d42A2D8a93014173Afc1461`](https://testnet-explorer.hskchain.net/address/0x7a1cB78CDE03f85a3d42A2D8a93014173Afc1461) |
| DemoToken (`hvUSD`)     | [`0x61764AE7fa269CC77Aa9C4f905FD7421459687C9`](https://testnet-explorer.hskchain.net/address/0x61764AE7fa269CC77Aa9C4f905FD7421459687C9) |
| DemoEligibilityProvider | [`0xCA3D0B1B19eda7a8Fa30B9aA2713D979Fb5d1db8`](https://testnet-explorer.hskchain.net/address/0xCA3D0B1B19eda7a8Fa30B9aA2713D979Fb5d1db8) |

### Grant lifecycles

A scripted integration run (`pnpm demo:testnet`) exercised all four grant shapes with real transactions and three distinct wallets.

| Grant          | Vault                                                                                                     | What it proves                                             |
| -------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| TIME           | [`0xb6Fd…5440`](https://testnet-explorer.hskchain.net/address/0xb6Fd5bFA1488152F9983729879A1C877b7155440) | Linear vesting and a full beneficiary claim                |
| MILESTONE      | [`0x79a4…6C1F`](https://testnet-explorer.hskchain.net/address/0x79a480f8F68dBe17447d0070EbFA6fDa5A836C1F) | Reviewer approvals unlocking partial, then final, claims   |
| HYBRID         | [`0x166B…C946`](https://testnet-explorer.hskchain.net/address/0x166B6040698795D618Ad65aB52E934cebC5bC946) | Claims limited by both conditions; 100 hvUSD fully claimed |
| REVOCABLE TIME | [`0x8eC3…F37F`](https://testnet-explorer.hskchain.net/address/0x8eC3Fd370de53EA50C23c9Ea33d58355f344F37F) | Issuer revocation that preserved earned value              |

**Revocation, read from the vault:** a 100 hvUSD revocable grant was revoked after the beneficiary had earned **16.94 hvUSD**. The beneficiary kept and claimed all 16.94 hvUSD; only the unearned **83.06 hvUSD** returned to the issuer.

Key transactions from the HYBRID and revocation runs:

| Step                                          | Transaction                                                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| HYBRID: create and fully fund                 | [`0xce36…206a`](https://testnet-explorer.hskchain.net/tx/0xce36cb920c16dd304ecb0d96cae57202bfd95309b7862dd6d463f4afe25f206a) |
| HYBRID: reviewer approves milestone 1         | [`0x1867…6341`](https://testnet-explorer.hskchain.net/tx/0x18678dbd0bc6d1d80111aad5535a6a01b6524f35bb802b10b4ca3f0839b56341) |
| HYBRID: beneficiary claims 40 hvUSD           | [`0x7c59…29b5`](https://testnet-explorer.hskchain.net/tx/0x7c59e41858b0771a18e0c53b8fdc0bfb33ef032c7eed9855a1e6d6dd852b29b5) |
| HYBRID: beneficiary claims the remainder      | [`0xf288…05ce`](https://testnet-explorer.hskchain.net/tx/0xf2888d914b7ab73d2d1dfe6f5f78e18568d140301a303aa45dc4ea86548605ce) |
| REVOCABLE: issuer revokes unearned allocation | [`0xb536…3945`](https://testnet-explorer.hskchain.net/tx/0xb536fd1f06b757017436f5492424a675bb3716e1a5f5f022eb6698c563c93945) |
| REVOCABLE: beneficiary claims earned value    | [`0x7ee8…ece9`](https://testnet-explorer.hskchain.net/tx/0x7ee8356628c59ae4a4500166781fe95327b02029b89e2cf161dcd29c6066ece9) |

The complete record — all 19 transactions, the three wallets, and the revocation amounts — is in [`testnet-demo.json`](testnet-demo.json).

## What is verified, and what is not

| Status              | Scope                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Verified onchain | Deployment; TIME, MILESTONE, HYBRID, and REVOCABLE TIME lifecycles through the scripted run above.                                                                                           |
| ✅ Verified in CI   | Foundry unit, fuzz, and adversarial tests; web unit tests; lint, typecheck, build, and the protocol/Cloud boundary check.                                                                    |
| ✅ Verified in CI   | The AI pipeline with no network: malformed model output, every provider failure, prompt injection, secret non-exposure, and the refusal to produce a transaction action.                     |
| 🟡 Manual           | One live provider run (Groq, `openai/gpt-oss-20b`): the example prompt drafts correctly in all three locales, and an injection prompt returns no address. Provider calls are not made in CI. |
| 🟡 Manual           | The three-wallet **browser** flow — organization, named members, hybrid grant, review, claim. Wallet extension steps are performed by hand and are tracked in HAS-20.                        |
| 🟡 Manual           | Blockscout source verification. The explorer returned HTTP 413 for the automated submission; deployment is unaffected.                                                                       |
| ✅ Presentation     | `/plans`, the landing summary, and their English / Spanish / Simplified Chinese product-model copy; presentation-only and independent of billing.                     |
| ⚪ Roadmap          | Unimplemented packaging capabilities are explicitly labeled in the product model; sponsored first claims still require the authorized factory redeploy gate.          |

## Future roadmap

Planned in the team's issue tracker, in delivery order. Each step must preserve the working grant flow and keep humans in control of financial actions.

**Implemented slices (P1 code, with deployment gates where noted)**

- Bounded batch grant creation and funding, for grant rounds.
- A human-reviewed AI Grant Builder that drafts grant terms for approval, never signing on its own.
- Organization-sponsored first claim implementation; the checked-in testnet factory predates `createSponsoredGrant`, so live use requires an authorized redeploy and artifact synchronization.

**Next — Cloud additions (P1/P2)**

- Organization-owned custom templates.
- Milestone evidence: reviewers see what was delivered before approving.
- Precise TGE and initial-unlock semantics.
- Advanced organization reporting and notifications.

**Then — intelligence and operations (P2)**

- AI Review Copilot for milestone evidence and reports.
- Organization-level reporting and notifications, building on the wallet dashboard analytics shipped for the buildathon.
- Multi-reviewer milestone quorum (1-of-N and M-of-N).
- Design of a transparent, optional protocol fee.
- Extraction of the protocol into a public `hashvest-protocol` repository and `@hashvest/protocol` package.

**Later — ecosystem (P3)**

- Weighted reviewer governance.
- Real compliance and attestation adapters behind `IEligibilityProvider`.
- An embedded SDK and white-label portals.
- Multiple wallets linked to one identity.

**Before any mainnet deployment:** a professional audit of `HashVestFactory` and `GrantVault`.

## Known limitations

- **Testnet only and unaudited.** Uses a faucet-mintable demo token with no monetary value.
- **No public hosted instance yet.** The app runs locally; see the [README](../README.md) for setup.
- **One reviewer per grant.** Quorum is on the roadmap.
- **Non-revocable grants are permanent by design**, including every vault deployed before revocation existed.
- **`DemoEligibilityProvider` is a demonstration**, not KYC or compliance.
- **The AI Grant Builder needs a model that honours `response_format: json_schema`.** One that does not never gets past the draft parser, so the feature degrades to offline drafting silently; `source` on a draft reports which path answered. A free provider tier also returns intermittent `5xx`, which falls back the same way.
- **The AI rate limiter is per process**, because zero retention rules out persisting per-wallet request history. A horizontally scaled deployment enforces the cap per instance.
- **Cloud packaging is presentation-only.** There is no billing, checkout, metering, plan assignment, or enforced Free / Team / Enterprise limit in this MVP.

## How this maps to the judging criteria

| Criterion                                     | HashVest                                                                                                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feasibility and real-world implementation     | Deployed and exercised end to end on HSK Chain with public transaction proof; a working app with organizations, members, and presets.                                                                                                              |
| Addresses a meaningful user or market problem | Grant and vesting payouts are a daily treasury workflow for ecosystems, DAOs, and startups — and today they run on trust and spreadsheets.                                                                                                         |
| Technical and product innovation              | HYBRID `min(time, milestones)` unlocking; revocation that provably cannot touch earned value; an enforced Protocol/Cloud boundary; and natural-language grant creation whose safety is a property of the schema rather than a promise in a prompt. |
