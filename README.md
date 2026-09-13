# HashVest

**Open programmable-grants infrastructure on HashKey Chain.** An issuer creates and fully funds an ERC20 GrantVault with immutable terms; a beneficiary claims tokens as time, reviewer-approved milestones, or both make them available. A workspace layer lets an organization run that protocol with named members, review queues, and presets.

This is a hackathon MVP deployed on **HSK Chain Testnet**. It is unaudited, uses demo assets, and is not production custody software.

## At a glance

|                    |                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Buildathon**     | Ethereum Bolivia Buildathon 2026 · EAG Global Buildathon                                                                                 |
| **Tracks**         | Real World Applications powered by HSK Chain · Real-World Ethereum Applications · Road to ShanhaiWoo                                     |
| **Network**        | HSK Chain Testnet (chain ID 133)                                                                                                         |
| **Factory**        | [`0x7a1cB78CDE03f85a3d42A2D8a93014173Afc1461`](https://testnet-explorer.hskchain.net/address/0x7a1cB78CDE03f85a3d42A2D8a93014173Afc1461) |
| **Live proof**     | TIME, MILESTONE, HYBRID, and revocable grant lifecycles with 19 public transactions — [`docs/testnet-demo.json`](docs/testnet-demo.json) |
| **Technical docs** | Problem, track, architecture, evidence, and roadmap — [`docs/submission.md`](docs/submission.md)                                         |
| **Architecture**   | Protocol/Cloud boundary and per-field authority — [`docs/architecture.md`](docs/architecture.md)                                         |
| **Protocol fee**   | Transparent optional create-time surplus (design only) — [`docs/protocol-fee-spec.md`](docs/protocol-fee-spec.md)                        |

## Features

### Protocol

- Time vesting with a start timestamp, optional initial unlock, cliff, and linear duration.
- Milestone grants with fixed amounts approved by a designated reviewer.
- Hybrid grants where both conditions constrain the claim: `unlocked = min(time vested, approved milestone amount)`.
- Optional `IEligibilityProvider` adapter, including a clearly labeled administrator-controlled demo allowlist.
- Optional one-way issuer revocation that recovers only unearned allocation while preserving earned and claimed beneficiary value.
- Organization-sponsored claims and reviews: organization-created grants use a versioned `SponsoredGrantVault`; the actor signs the exact claim or milestone approval and a server-only relayer pays HSK gas.
- One fully funded vault per grant; SafeERC20 rejects underfunded fee-on-transfer funding.
- Optional protocol fee: designed as a later create-time issuer surplus that never reduces allocation; not implemented. See [`docs/protocol-fee-spec.md`](docs/protocol-fee-spec.md).
- Beneficiary-only claims, role dashboards, explorer links, and real HSK Testnet transactions.
- Optional AI Grant Builder: a description becomes a validated, fully editable draft. It cannot sign, fund, approve, claim, revoke, or choose a wallet, and it works with no provider configured.

### Cloud

- Wallet sign-in (SIWE) for workspace access, kept separate from wallet connection.
- Organizations and a member directory, so beneficiaries and reviewers are chosen by name instead of by pasted address.
- Editable grant presets — Builder Grant, Employee Vesting, Advisor Vesting, and Ecosystem Grant — in a five-step creation wizard (Template, Grant, Strategy, Conditions, Review).
- Review and claim queues, plus lifecycle and funding health computed from live HSK reads.
- Bounded batch grant creation for cohorts and a human-reviewed AI Grant Builder that produces editable drafts.
- Organization-sponsored claims and reviews are implemented behind a deployment gate; an actor signature and server-only relayer pay HSK gas, with the wallet-paid claim or approval always available as fallback.
- Private milestone evidence for organization members: a URL, type, and optional note attached to the canonical grant identity and milestone index. Reviewers still approve only through the existing onchain `approveMilestone` action.
- A wallet dashboard with grants by role, strategy, and lifecycle and a six-month activity timeline from HSK events, as a read-only projection of chain state.
- Bounded organization reporting from live vault reads: lifecycle counts, allocations grouped by token identity, and upcoming cliffs. Every figure names its vault field, and there is no cross-token total, price, or conversion.
- In-app lifecycle notifications derived from current vault state, deduplicated by the state fact they report rather than by an event log, so no indexer is required and the stream stays bounded.
- Full English, 简体中文, and Español localization with typed English fallback.

## Architecture

```text
Next.js
   |                         |
SIWE session          server-only Supabase
   |                         |
workspace UI          Postgres product context
   |
wagmi / viem
   |
HSK Testnet (chain 133)
   |
HashVestFactory ---- role discovery arrays
   |
GrantVault #1, #2, #3 ...
SponsoredGrantVault #organization grants
```

Each vault stores the issuer, beneficiary, reviewer, token, allocation, strategy, vesting schedule, optional initial unlock, milestone titles and amounts, eligibility provider, and revocable mode as immutable terms. Milestone approvals, claims, and the optional one-way revocation state are the only lifecycle changes after creation. Revocation freezes earned value and returns only unearned allocation to the issuer; non-revocable grants and previously deployed vaults remain permanent. Organization metadata is an optional off-chain product layer and never replaces contract state.

### Design refactor and live dashboard analytics

[`design.md`](design.md) is the prescriptive visual source of truth for the
dark dashboard language: near-black surfaces, warm mono typography, green
primary state, cobalt secondary state, restrained borders/radii, and point/data
art. The reusable primitives live in `apps/web/components/ui/`; the shell is
responsive from a 192px desktop rail to a mobile drawer.

`apps/web/hooks/use-dashboard-analytics.ts` reads the factory's role-discovery
arrays, derives grant state from live GrantVault snapshots, and reads only the
factory/vault lifecycle events needed for the six-month activity view. The pure
aggregation lives in `apps/web/lib/dashboard/analytics.ts` and is unit-tested.
This is a read-only presentation projection: HSK remains authoritative for
roles, amounts, permissions, and lifecycle; Supabase only enriches workspace
names and associations. Failed event windows render a partial timeline instead
of replacing live grant state with fabricated data.

The web UI keeps user-visible failures inside the localization boundary: generic and known HSK RPC errors use the active locale, while validation and wallet-guard messages that are already translated remain intact. Protocol and Cloud helpers may still retain English defaults for non-UI callers.

### Protocol and Cloud layers

The repository holds two layers. **HashVest Protocol** is `packages/contracts` plus the protocol-facing `packages/web3` exports; it holds funds and enforces unlock math. **HashVest Cloud** is `apps/web` plus Supabase, SIWE sessions, organizations, and metadata; it makes the protocol usable and is optional to every protocol operation. Cloud depends on Protocol through `@hashvest/web3`; Protocol never depends on Cloud.

[`docs/architecture.md`](docs/architecture.md) is the authoritative definition: per-field authority, the public integration surface and extension points, the future `hashvest-protocol` / `@hashvest/protocol` extraction boundary, the automated checks that enforce all of it, and the hackathon critical path and stop-adding-features rule.

### Product model presentation (HAS-36)

The landing page includes a short Protocol / Cloud summary and `/plans`
contains the judge-visible Free / Team / Enterprise value ladder. Protocol is
open infrastructure for programmable grants on HashKey Chain; Cloud adds
organization management, members, templates, reviews, reporting, batch
coordination, and human-reviewed AI assistance around it.

The page also explains optional sponsored gas, AI credits, and compliance
checks. This is product communication only: it has no prices, checkout,
invoicing, billing webhooks, metering, entitlements, or enforced plan limits.
Each capability is marked **Available in demo** or **Roadmap**. The sponsored
action implementation is present on the current branch, but the checked-in
testnet deployment predates `createSponsoredGrant`, so the product page keeps
that capability roadmap-labeled until an authorized redeploy. The demo path
continues to work independently through `/grants/new` and `/app`.

### Organizations product layer

Organizations are workspaces around existing GrantVaults. Supabase stores organization names, members, presentation role labels, GrantVault associations, descriptions, organization-owned grant templates — draft wizard configuration, never vault state or permission (see [`docs/organization-templates.md`](docs/organization-templates.md)) — and private milestone evidence metadata. Evidence is associated with `(chain_id, vault_address, milestone_index)` and is visible only to authenticated organization members. HSK remains authoritative for issuer, beneficiary, reviewer, token, allocation, strategy, schedules, milestone approval, unlocked/claimable/claimed amounts, eligibility, balances, and funds.

The canonical identities are lowercase EVM addresses for wallets, `(chain_id, vault_address)` for grants, and UUIDs for organizations. The current organization schema accepts HSK Testnet only (`chain_id = 133`). Product role labels such as `Treasury Reviewer` are presentation metadata; they do not grant permission to approve or claim.

An organization owner manages its templates on the workspace Templates tab; every other member can read them and apply one in either wizard, but cannot change them, and deleting a template archives it so grants already created from it keep their name. Applying a template only fills editable wizard fields — it never submits a transaction, sets a beneficiary, or grants permission.

The workspace Reports tab derives an operational report from the same live vault reads: lifecycle counts, allocations grouped by token identity, upcoming cliffs and vesting ends, and the connected wallet's own review and claim queues. The organization overview additionally derives in-app lifecycle notifications whose identity comes from the state fact each one reports, so repeated reads cannot grow the stream and no indexer is needed. Only read/unread is stored. See [`docs/organization-reporting.md`](docs/organization-reporting.md).

Organization writes go through authenticated Next.js Route Handlers. The browser never uses the Supabase service-role key or writes organization tables directly. Workspace grant cards and queues join organization metadata with fresh GrantVault reads; they do not aggregate token balances or invent USD values.

Organization sponsorship is an opt-in Cloud policy around two protocol operations: beneficiary claims and reviewer milestone approvals. The actor wallet signs an EIP-712 intent binding the exact vault, role, payload, nonce, deadline, and relayer; `SponsoredGrantVault` enforces those fields on HSK. Supabase tracks policy, vault/action allowlists, quotas, gas budget, and request/receipt status only. If the relayer is unavailable, the policy is disabled, the grant is legacy, or the request fails, the wallet-paid action remains available. See [`docs/sponsored-claims.md`](docs/sponsored-claims.md) for the decision, threat model, costs, and deployment gate.

### AI Grant Builder

A collapsible section in the grant wizard's Template step turns a short description into a draft. The draft is a _preset_, not a grant: it is validated by the same `assertValidPreset` gate the hand-written Builder/Employee/Advisor/Ecosystem templates pass and applied through the same preset path, so `prepare()` remains the only source of truth for what is submitted onchain. There is no submission path that only AI output uses.

The draft type has no field for a beneficiary, reviewer, token, eligibility provider, start timestamp, or revocability, so a model cannot suggest an identity or a transaction at all. Prompts are redacted before they leave the server and are never retained. A provider that is unavailable, unauthorized, rate-limited, slow, or incoherent falls back to a deterministic offline drafter, so the feature never blocks the wizard.

Full contract, limits, failure matrix, and privacy boundary: [`docs/ai-grant-builder.md`](docs/ai-grant-builder.md).

### Organization AI tools (HAS-19 / HAS-17)

Owners can generate reusable organization templates inside the new-template
editor, inspect assumptions and unsupported requests, apply editable suggestions
and explicitly save through the ordinary template CRUD. Members can analyze
private milestone notes and current HSK reads on GrantDetail, reached from the
review queue. Every finding cites supplied sources; linked content is not fetched.
Recommendations are advisory text and cannot execute approval.

Members can also have the organization report read back to them on
`/app/organizations/<uuid>/reports`. The server re-reads the associated vaults
itself rather than trusting the figures the browser derived, bounded to twelve
vaults per call, and every sentence cites a section of that page so a claim is
checked by scrolling. Because HashVest has no price feed, a sentence naming a
fiat amount, a conversion, a valuation, TVL or a yield — or totalling across
tokens — is rejected outright rather than merely discouraged, and a vault that
could not be read is declared instead of counted as zero.

All three use independent, collapsible sections and the same server-only AI
provider configuration as the Grant Builder. Any analysis can be copied as plain
text, citations included, for a reviewer to paste into their own decision. A
missing or failed provider leaves manual template creation, review and reporting
available. Prompts and raw responses are never retained; only template
configuration explicitly reviewed and saved by an owner becomes normal
organization metadata. No migration or redeployment is required.
See [`docs/ai-tools.md`](docs/ai-tools.md) for permissions, limits, tests and the
optional synthetic live-provider smoke test.

### Unlock semantics

`initialUnlock` is an explicit token amount, included once in `totalAllocation`. It is optional and defaults to `0`. Pure `MILESTONE` grants reject `initialUnlock > 0`.

- `TIME`: `unlockedAmount = vestedByTime`.
- `MILESTONE`: `unlockedAmount = sum(approved milestone amounts)`.
- `HYBRID`: `unlockedAmount = initialUnlock + min(vestedByTime - initialUnlock, milestoneUnlockedAmount)` after `start`; `0` before `start`.

Time vesting (`vestedByTime`) for `TIME` and `HYBRID`:

- before `start`: `0`
- from `start` until `start + cliff`: exactly `initialUnlock`
- at or after `start + duration`: `totalAllocation`
- otherwise: `initialUnlock + floor((totalAllocation - initialUnlock) * (t - start) / duration)`

The cliff holds the remaining allocation without restarting the curve. Rounding uses Solidity `mulDiv` (floor). Repeated claims subtract `claimedAmount` from `unlockedAmount` and never re-count `initialUnlock`.

`HYBRID` and `MILESTONE` milestone amounts must sum exactly to the remaining allocation (`totalAllocation - initialUnlock` on `HYBRID`, `totalAllocation` on `MILESTONE`), and no more than 20 milestones are accepted. The grant wizard preview uses the same helpers as the contract (`calculateVestedByTime` / `calculateUnlockedAmount` in `apps/web/lib/protocol/grants.ts`).

## Installation

Prerequisites: Node.js 22+, pnpm 10+, Foundry (`forge`, `cast`, `anvil`), a browser wallet, and an optional WalletConnect Cloud project ID.

```bash
pnpm install --frozen-lockfile
cd packages/contracts
forge install --no-git --shallow foundry-rs/forge-std@v1.9.7 OpenZeppelin/openzeppelin-contracts@v5.4.0
cd ../..
cp apps/web/.env.local.example apps/web/.env.local
cp packages/contracts/.env.example packages/contracts/.env
```

`--no-git` installs the contract dependencies as plain directories instead of git submodules. `packages/contracts/lib` is ignored, so the submodule bookkeeping adds nothing and fails outright inside a git worktree, leaving a partial install plus a stray `.gitmodules`. Foundry 1.0 removed `--no-commit`; committing is now opt-in through `--commit`.

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect connections. Browser injected wallets remain available when it is blank. Keep `DEPLOYER_PRIVATE_KEY` only in `packages/contracts/.env`; it is never read by the web application.

For workspace features, set the browser-facing Supabase URL and anon key plus the server-only values in `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=
AUTH_APP_URL=http://localhost:3000
HSK_TESTNET_RPC_URL=
SPONSORED_CLAIM_RELAYER_PRIVATE_KEY=
```

Generate `AUTH_SECRET` with `openssl rand -base64 32` or another cryptographically random secret. Never prefix `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, or `AI_API_KEY` with `NEXT_PUBLIC_`, commit them, or expose them to browser code. `AUTH_APP_URL` should be the canonical application origin when deployed behind a proxy; leave it at the local origin for local development.

All three AI tools share the following optional server-only provider configuration:

```dotenv
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
AI_MAX_TOKENS=
```

Any OpenAI-compatible `/chat/completions` endpoint works, so `AI_BASE_URL` and `AI_MODEL` are the only difference between Groq (the default, `https://api.groq.com/openai/v1` and `openai/gpt-oss-20b`, verified end to end on its free tier), xAI, OpenRouter, DeepSeek, Zhipu, or a local Ollama or LM Studio server. Setting only `AI_API_KEY` is enough to get a working provider.

The model must honour `response_format: json_schema`; one that does not never gets past the draft parser, so the feature degrades to offline drafting silently. Check `source` on a draft — `"model"` or `"fallback"` — before concluding a provider is configured correctly. With `AI_API_KEY` blank the feature still works: it falls back to a deterministic offline drafter, so the demo never depends on a provider being reachable. [`docs/ai-grant-builder.md`](docs/ai-grant-builder.md) records the measured provider matrix.

Apply the tracked organization migration to the existing Supabase project from a machine with Supabase CLI access:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

`supabase db push` applies all tracked migrations in order. The base migration
[`supabase/migrations/20260912000000_hashvest_organizations.sql`](supabase/migrations/20260912000000_hashvest_organizations.sql)
creates `organizations`, `organization_members`, `organization_grants`, and
server-only `auth_nonces`. The first-claim prototype migration
[`supabase/migrations/20260913000000_hashvest_sponsored_claims.sql`](supabase/migrations/20260913000000_hashvest_sponsored_claims.sql)
adds the historical `sponsored_claim_policies` and `sponsored_claim_requests`
tables and is not mutated after apply. The organization-template migration
[`supabase/migrations/20260913010000_hashvest_organization_templates.sql`](supabase/migrations/20260913010000_hashvest_organization_templates.sql)
adds `organization_templates` with database constraints for every grant
strategy rule; it requires PostgreSQL 15 or later. The milestone-evidence
migration
[`supabase/migrations/20260913020000_hashvest_milestone_evidence.sql`](supabase/migrations/20260913020000_hashvest_milestone_evidence.sql)
adds `organization_grant_milestone_evidence`, keyed by
`(chain_id, vault_address, milestone_index)`, with HSK Testnet, lowercase
vault, non-negative index, and safe-URL constraints. The notification-read
migration
[`supabase/migrations/20260913030000_hashvest_notification_reads.sql`](supabase/migrations/20260913030000_hashvest_notification_reads.sql)
adds `organization_notification_reads`, keyed by
`(organization_id, member_wallet, notification_key)`, holding only whether a
member has seen a derived notification; the notifications themselves are never
stored. The HAS-28 migration
[`supabase/migrations/20260913040000_hashvest_sponsored_actions.sql`](supabase/migrations/20260913040000_hashvest_sponsored_actions.sql)
adds `organization_sponsorship_policies`, `sponsored_action_requests`, and
server-only reservation, lease, settle, and expiry functions. All product tables use the
same closed RLS posture and intentionally grant no public/anon/authenticated
table policies. The application uses the service role only from server Route
Handlers, while business authorization still checks the verified session and
organization membership/ownership. [`supabase/verification/organization_templates.sql`](supabase/verification/organization_templates.sql)
asserts the template constraints against a disposable database and must never
run against a real project.

`SPONSORED_CLAIM_RELAYER_PRIVATE_KEY` is server-only and must be a separately
funded HSK relayer account. It is not a deployer key and must never be placed in
a `NEXT_PUBLIC_` variable. The feature is disabled by default; do not configure
it against production funds.

If a wallet reports HSK Testnet chain 133 but an approval shows `eth_getBlockByNumber` or a thirdweb support error, its saved RPC endpoint is unavailable. Use the **Use canonical HSK RPC** action in the app, or set the wallet network RPC to `https://testnet.hsk.xyz` with chain ID `133`.

## Running the app

Run the app and checks:

```bash
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

The responsive design contract is covered by Playwright snapshots. Install a
local browser once with `pnpm --filter @hashvest/web exec playwright install chromium`,
then run `pnpm --filter @hashvest/web visual`. The snapshots exercise the public
landing, disconnected mobile navigation, and deterministic connected dashboard
fixture; the fixture route returns 404 in production and never reads or writes
HSK state.

AI sections also have desktop/mobile coverage in EN, ES and zh-CN. Playwright
starts its own server and refuses to reuse an existing one. Set
`HASHVEST_VISUAL_PORT` (for example `3101`) when another worktree owns `3100`.
The `/visual/ai-tools` fixture is additionally gated by `VISUAL_TEST_MODE=1`.

The application is available at `http://localhost:3000`. Routes are `/` (landing), `/plans` (public Protocol / Cloud and Free / Team / Enterprise presentation), `/app` (live overview), `/app/grants` (Issued / Received / Review), `/app/organizations` (organization list), `/app/organizations/new`, `/app/organizations/<uuid>`, `/app/organizations/<uuid>/members`, `/app/organizations/<uuid>/templates`, `/app/organizations/<uuid>/reports`, `/app/organizations/<uuid>/settings`, `/app/organizations/<uuid>/grants`, and `/app/organizations/<uuid>/grants/new`, `/app/settings` (workspace session, language, network, and sponsored-claim policy links), plus `/grants/new` (the shared five-step template-aware creation wizard: Template, Grant, Strategy, Conditions, Review) and `/grants/<GrantVault address>` (public role-aware detail page). The previous `/app/settings/organizations/...` paths remain compatibility redirects. `/visual/dashboard`, `/visual/templates` and `/visual/ai-tools` are local-only deterministic fixtures for the Playwright visual contract and are unavailable in production.

Wallet connection and workspace authentication are separate. After connecting an HSK Testnet wallet, click **Sign in to workspace** and approve one SIWE/EIP-4361 message. The server stores a five-minute, one-time nonce and issues a 24-hour HttpOnly, SameSite session cookie signed with `AUTH_SECRET`. If the connected wallet changes, organization reads and writes are disabled until the new wallet explicitly signs in; the application never silently signs or writes as the previous wallet.

## Technical integration

The protocol is usable without this application. Integrators depend on the contracts and the `@hashvest/web3` protocol surface, never on the Cloud API.

- **Create grants** by calling `HashVestFactory.createGrant`, which deploys a `GrantVault` and transfers the full allocation in the same transaction. The wizard at `/grants/new` is one client of this call, not the interface.
- **Discover grants** with `getGrantsByIssuer`, `getGrantsByBeneficiary`, and `getGrantsByReviewer`. These role arrays mean a frontend can list a wallet's grants without an indexer or a database.
- **Read and act on a grant** through `grantVaultAbi`: unlocked, claimable, and claimed amounts, milestone approval, claims, and optional revocation.
- **Gate claims** by implementing `IEligibilityProvider` and passing its address at creation. `DemoEligibilityProvider` is a reference implementation, not KYC.
- **Reuse the integration layer.** `packages/web3/src/protocol.ts` exports the HSK chain definitions, the factory, vault, token, and eligibility ABIs, the confirmed testnet deployment, and explorer URL helpers. It has no dependency on the Cloud layer, and `pnpm boundary:check` fails if that changes.

The Cloud HTTP routes under `apps/web/app/api` are application-private: session-bound, same-origin guarded, and not a public API. See the public integration surface in [`docs/architecture.md`](docs/architecture.md).

## Contracts and deterministic integration

Build and synchronize artifacts without manually copying ABI JSON or addresses:

```bash
pnpm contracts:build
pnpm contracts:test
pnpm contracts:sync
pnpm contracts:sync:check
```

`contracts:sync` reads Foundry artifacts into the generated ABI exports in `packages/web3/src/abis/generated.ts`. After a successful broadcast, `contracts:sync:addresses` reads the confirmed HSK Testnet broadcast and writes `packages/web3/src/addresses/hsk-testnet.json`. The address parser rejects wrong-chain, partial, duplicate, reverted, and zero-address deployment data.

## HSK Testnet deployment

Deployment is guarded by the actual EVM chain ID and aborts unless `block.chainid == 133`. It runs contract build and tests before broadcasting, requires a configured key and funded deployer, deploys `HashVestFactory`, `DemoToken` (`hvUSD`, 18 decimals), and `DemoEligibilityProvider`, then verifies bytecode, receipts, metadata, and role discovery with read-only calls.

```bash
pnpm contracts:deploy:testnet
pnpm contracts:smoke:testnet
```

The current deployment is written to `packages/web3/src/addresses/hsk-testnet.json` after a successful broadcast. The canonical explorer is [HSK Testnet Explorer](https://testnet-explorer.hskchain.net). The generated deployment artifact remains the source of truth; the current values are repeated below for demo convenience. The checked-in deployment predates `createSponsoredGrant`; organization-sponsored claims require an explicitly authorized factory redeployment and address synchronization before use. This change does not broadcast or redeploy.

Current HSK Testnet deployment (chain 133; bytecode and read-only smoke verified):

| Contract                | Address                                                                                                                                  | Deployment transaction                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HashVestFactory         | [`0x7a1cB78CDE03f85a3d42A2D8a93014173Afc1461`](https://testnet-explorer.hskchain.net/address/0x7a1cB78CDE03f85a3d42A2D8a93014173Afc1461) | [`0xebc1200b38502a999434cb99469ca33d40f58c45079753a1d54d85aed167b34b`](https://testnet-explorer.hskchain.net/tx/0xebc1200b38502a999434cb99469ca33d40f58c45079753a1d54d85aed167b34b) |
| DemoToken (`hvUSD`)     | [`0x61764AE7fa269CC77Aa9C4f905FD7421459687C9`](https://testnet-explorer.hskchain.net/address/0x61764AE7fa269CC77Aa9C4f905FD7421459687C9) | [`0x7095a16f4b2db49fb55838c169eefafdb7c8ebb9c1d3e85a07c4c2bdb82dd3ec`](https://testnet-explorer.hskchain.net/tx/0x7095a16f4b2db49fb55838c169eefafdb7c8ebb9c1d3e85a07c4c2bdb82dd3ec) |
| DemoEligibilityProvider | [`0xCA3D0B1B19eda7a8Fa30B9aA2713D979Fb5d1db8`](https://testnet-explorer.hskchain.net/address/0xCA3D0B1B19eda7a8Fa30B9aA2713D979Fb5d1db8) | [`0xab01f3350a34949602448fb460469349b6eab994853be64a2962735072af2df6`](https://testnet-explorer.hskchain.net/tx/0xab01f3350a34949602448fb460469349b6eab994853be64a2962735072af2df6) |

The latest clean live lifecycle evidence is recorded in [`docs/testnet-demo.json`](docs/testnet-demo.json), including the TIME, MILESTONE, HYBRID, and REVOCABLE TIME grant vaults and every public transaction hash.

Optional Blockscout verification (secondary to a working deployment):

```bash
pnpm contracts:verify:testnet
```

The current Blockscout endpoint returned HTTP 413 (`Request Entity Too Large`) for the Forge submission, so automated verification is currently non-blocking. To retry, run the command above; if the endpoint still rejects the payload, submit the three source contracts manually in the explorer using the constructor arguments recorded in `packages/contracts/broadcast/DeployHashVest.s.sol/133/run-latest.json`. Verification failure does not invalidate deployment.

## Demo flow

### Organization workspace

1. Open the app with three wallets available on HSK Testnet (issuer/owner, reviewer, beneficiary).
2. Connect the issuer wallet, click **Sign in to workspace**, and create an organization such as `HashKey LATAM Ecosystem`. The creator becomes its owner/member.
3. Open **Members**, add the reviewer and beneficiary wallets with display names and presentation labels such as `Treasury Reviewer` and `Builder`.
4. Choose **Create grant** from the organization. Select the beneficiary and reviewer by name, or use the secondary **Use external wallet** escape hatch. Select **Hybrid**, add milestones totaling the allocation, choose a short schedule, and approve spending.
5. Wait for the HSK transaction to confirm. The app then links `(133, GrantVault address)` to the organization with the optional description. If that metadata request fails, use **Retry workspace sync**; do not create another grant.
6. Switch to the reviewer wallet, connect, sign in explicitly, and open the organization review queue. The next pending milestone shows any private workspace evidence. **Review grant** opens the existing GrantDetail page, where the reviewer still approves only through the onchain `approveMilestone` action.
7. Switch to the beneficiary wallet, connect, sign in explicitly, and open the organization workspace from **Settings**. The grant appears with its live claimable amount; open GrantDetail and claim the real hvUSD.

To use the sponsored-action path after the new factory is deployed, the owner enables **Sponsored protocol actions** in the organization overview, allowlists vaults, chooses claim and/or review, and sets action, daily, and HSK gas limits. Members can see usage and remaining budget. On GrantDetail, **Sponsor this claim** or **Sponsor approval** shows the exact payload and relayer, asks for an EIP-712 signature, and displays the request/receipt state. The normal **Claim** and **Approve** actions remain the fallback and are always wallet-paid.

The direct protocol flow remains available at `/grants/new`: enter raw beneficiary/reviewer addresses and create TIME, MILESTONE, or HYBRID grants without organization metadata. Existing GrantVaults can be attached later by an organization owner from the overview using **Link an existing GrantVault**. The server verifies bytecode, GrantVault reads, and the actual onchain issuer before association.

Every approval, creation, milestone, faucet, claim, and revocation transaction exposes an HSK Testnet explorer link. Use `/app/grants` to move between role-specific grants.

Open the workspace **Reports** tab (HAS-41) at any point to see the same grants aggregated by lifecycle and by token, with each figure labeled with the vault field it was read from. The organization overview shows lifecycle notifications (HAS-37) for the connected wallet: a pending review reaches the reviewer, a claimable balance reaches the beneficiary, and a vault that could not be read is shown as unverified rather than as an event.

For the controlled-wallet browser rehearsal, copy the public-address-only fixture and follow [`docs/browser-rehearsal.md`](docs/browser-rehearsal.md). `pnpm rehearsal:check` performs a read-only HSK/deployment/wallet readiness check; live browser execution and evidence are tracked separately in HAS-20.

## Security boundary

HashVest MVP has not been professionally audited. It targets HSK Testnet only, uses a faucet-mintable demo token, and should not hold production funds. Revocation is available only on explicitly revocable new vaults, is issuer-only and one-way, and preserves earned beneficiary entitlement; non-revocable and old vaults have no issuer withdrawal path. `DemoEligibilityProvider` is an adapter demonstration, not KYC or compliance. The AI Grant Builder is advisory only: it drafts editable form values, never signs, funds, approves, claims, revokes, or selects a wallet, retains no prompt or model output, and keeps its provider key server-side in a single allowlisted module.

## Roadmap

The product roadmap after the buildathon — remaining Cloud additions, AI-assisted review, reviewer quorum, protocol extraction, and a separately reviewed protocol-fee implementation — is described in [`docs/submission.md`](docs/submission.md#future-roadmap). Organization templates, sponsored protocol actions, the human-reviewed AI Grant Builder, TGE unlock semantics, private milestone evidence, and organization reporting and lifecycle notifications (HAS-41/HAS-37) have already landed as Cloud context. The HAS-40 fee model is specified, not deployed. A professional audit is the precondition for any mainnet deployment.

Hackathon P0 work, by milestone and owning layer:

| Milestone                               | Owner            |
| --------------------------------------- | ---------------- |
| M0 — Protocol/Cloud boundary & baseline | Cloud + Protocol |
| M1 — Global grant templates             | Cloud            |
| M2 — Revocation & protocol safety       | Protocol         |
| M3 — Lifecycle & funding health         | Cloud            |
| M4 — i18n, browser E2E & submission     | Cloud + Protocol |

Post-hackathon milestones M5–M7 cover P1–P3 work: AI-assisted review, reviewer quorum, analytics, notifications, compliance and attestation adapters, an embedded SDK, extraction of the protocol into a public `hashvest-protocol` repository, and a separately reviewed protocol-fee implementation. The HAS-40 fee model is specified in [`docs/protocol-fee-spec.md`](docs/protocol-fee-spec.md) and is not deployed. Organization templates, bounded batch creation, sponsored protocol actions, the human-reviewed AI Grant Builder, TGE unlock semantics, and private milestone evidence (HAS-15/HAS-14) have landed as Cloud context; HSK remains authoritative for reviewer, approval, and value. New scope during the hackathon is a swap, never an addition — see the stop-adding-features rule in [`docs/architecture.md`](docs/architecture.md).

## Contributing with agents

The shared agent contract is [`AGENTS.md`](AGENTS.md). Canonical project skills live in [`.agents/skills/`](.agents/skills/), and generated Claude adapters live in [`.claude/skills/`](.claude/skills/). The compatibility and maintenance rules are in [`docs/agents/`](docs/agents/README.md).

Before creating or updating a PR, agents must run `pnpm agents:sync`, `pnpm agents:check`, and `pnpm ci:check`. Work is delivered in small, logically grouped commits; a Linear issue is used when available, while an explicitly requested issue-free design branch records its scope in `design.md` and the handoff. Changes to commands, paths, APIs, schemas, locales, architecture, deployments, CI, or user flows must update the affected skills, this README, `AGENTS.md`, and relevant docs in the same change.

<!-- BEGIN:hashvest-agent-catalog -->

### Agent workflow catalog

Canonical skills live in `.agents/skills/`; Claude adapters are generated in `.claude/skills/`.

- [`agent-maintenance`](.agents/skills/agent-maintenance/SKILL.md) — Keep HashVest agent instructions, skills, generated adapters, README, architecture docs, and CI contracts synchronized whenever repository behavior or references change.
- [`ai-assistance`](.agents/skills/ai-assistance/SKILL.md) — Build or change HashVest AI assistance while keeping model output advisory, validated against the protocol's own rules, provider-agnostic, and free of retained prompts or exposed secrets.
- [`architecture`](.agents/skills/architecture/SKILL.md) — Design or review HashVest changes while preserving the Cloud, web3, Protocol, Supabase, and HSK authority boundaries documented by the repository.
- [`ci-preflight`](.agents/skills/ci-preflight/SKILL.md) — Reproduce the HashVest GitHub CI validation locally, diagnose failures without hiding them, and produce exact evidence before a pull request is created or updated.
- [`deployment`](.agents/skills/deployment/SKILL.md) — Plan, rehearse, execute, or verify HashVest HSK Testnet operations with chain guards, explicit transaction authority, safe secrets, and evidence-backed state changes.
- [`localization`](.agents/skills/localization/SKILL.md) — Add or update HashVest localized strings for selected languages using the typed English source dictionary, safe fallbacks, preserved technical literals, and focused validation.
- [`pr-delivery`](.agents/skills/pr-delivery/SKILL.md) — Deliver focused HashVest work through incremental commits, evidence-backed review, and a validated pull-request workflow, with Linear linkage when required by the requester.
- [`ui-ux`](.agents/skills/ui-ux/SKILL.md) — Implement the HashVest design specification as accessible, responsive UI while preserving wallet, session, transaction, analytics authority, and localization behavior.
- [`workspace-setup`](.agents/skills/workspace-setup/SKILL.md) — Set up or diagnose the HashVest monorepo safely, including Node, pnpm, Foundry, package-local environment templates, and reproducible dependencies.

After changing a skill, run `pnpm agents:sync` and `pnpm agents:check`.
<!-- END:hashvest-agent-catalog -->

## Repository layout

```text
apps/web                 Cloud     Next.js wallet application
  lib/protocol           Protocol  chain-facing helpers, wagmi config, onchain roles, vault verification
  lib/cloud              Cloud     Supabase, SIWE sessions, organizations, AI provider
  lib/shared             shared    layer-neutral utilities, i18n, grant presets, AI draft contract
packages/contracts       Protocol  Solidity contracts, Foundry tests, deployment script
packages/web3            Protocol  HSK chain config, generated ABIs, deployment data, sync scripts
packages/ui              shared    Shared UI package placeholder
packages/config          shared    Shared TypeScript and ESLint configuration
scripts                  shared    Repository-wide boundary checks
supabase/migrations      Cloud     Tracked product-context schema and RLS migrations
supabase/verification    Cloud     Constraint checks for migrations, disposable databases only
```

Imports run one way: Cloud may depend on Protocol, never the reverse. `pnpm boundary:check` enforces this, along with service-role secret containment, protocol export drift, and documentation links. See [`docs/architecture.md`](docs/architecture.md).

Important organization implementation files include `apps/web/lib/auth` (SIWE challenge verification and signed sessions), `apps/web/lib/organizations` (validation, server authorization, HSK GrantVault verification, types, and browser API client), `apps/web/hooks/use-organizations.ts` (TanStack Query data layer), and `apps/web/components/organization-*` / `members-manager.tsx` / `templates-manager.tsx` / `template-editor.tsx` (workspace UI). Organization lifecycle state remains derived from live protocol reads; it is not stored in Supabase.
