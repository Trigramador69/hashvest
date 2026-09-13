# HashVest

HashVest is a programmable grant and vesting protocol for HashKey Chain. An issuer creates and fully funds an ERC20 GrantVault with immutable terms; a beneficiary claims tokens as time, milestone approval, or both make them available.

This is a hackathon MVP for HSK Testnet. It is unaudited, uses demo assets, and is not production custody software.

## Agent-assisted development

The shared agent contract is [`AGENTS.md`](AGENTS.md). Canonical project skills live in [`.agents/skills/`](.agents/skills/), and generated Claude adapters live in [`.claude/skills/`](.claude/skills/). The compatibility and maintenance rules are in [`docs/agents/`](docs/agents/README.md).

Before creating or updating a PR, agents must run `pnpm agents:sync`, `pnpm agents:check`, and `pnpm ci:check`. Work is delivered in small, logically grouped commits; a Linear issue is used when available, while an explicitly requested issue-free design branch records its scope in `design.md` and the handoff. Changes to commands, paths, APIs, schemas, locales, architecture, deployments, CI, or user flows must update the affected skills, this README, `AGENTS.md`, and relevant docs in the same change.

<!-- BEGIN:hashvest-agent-catalog -->

### Agent workflow catalog

Canonical skills live in `.agents/skills/`; Claude adapters are generated in `.claude/skills/`.

- [`agent-maintenance`](.agents/skills/agent-maintenance/SKILL.md) — Keep HashVest agent instructions, skills, generated adapters, README, architecture docs, and CI contracts synchronized whenever repository behavior or references change.
- [`architecture`](.agents/skills/architecture/SKILL.md) — Design or review HashVest changes while preserving the Cloud, web3, Protocol, Supabase, and HSK authority boundaries documented by the repository.
- [`ci-preflight`](.agents/skills/ci-preflight/SKILL.md) — Reproduce the HashVest GitHub CI validation locally, diagnose failures without hiding them, and produce exact evidence before a pull request is created or updated.
- [`deployment`](.agents/skills/deployment/SKILL.md) — Plan, rehearse, execute, or verify HashVest HSK Testnet operations with chain guards, explicit transaction authority, safe secrets, and evidence-backed state changes.
- [`localization`](.agents/skills/localization/SKILL.md) — Add or update HashVest localized strings for selected languages using the typed English source dictionary, safe fallbacks, preserved technical literals, and focused validation.
- [`pr-delivery`](.agents/skills/pr-delivery/SKILL.md) — Deliver focused HashVest work through incremental commits, evidence-backed review, and a validated pull-request workflow, with Linear linkage when required by the requester.
- [`ui-ux`](.agents/skills/ui-ux/SKILL.md) — Implement the HashVest design specification as accessible, responsive UI while preserving wallet, session, transaction, analytics authority, and localization behavior.
- [`workspace-setup`](.agents/skills/workspace-setup/SKILL.md) — Set up or diagnose the HashVest monorepo safely, including Node, pnpm, Foundry, package-local environment templates, and reproducible dependencies.

After changing a skill, run `pnpm agents:sync` and `pnpm agents:check`.
<!-- END:hashvest-agent-catalog -->

## MVP features

- Time vesting with a start timestamp, cliff, and linear duration.
- Milestone grants with fixed amounts approved by a designated reviewer.
- Hybrid grants where both conditions constrain the claim: `unlocked = min(time vested, approved milestone amount)`.
- Optional `IEligibilityProvider` adapter, including a clearly labeled administrator-controlled demo allowlist.
- Optional one-way issuer revocation that recovers only unearned allocation while preserving earned and claimed beneficiary value.
- One fully funded vault per grant; SafeERC20 rejects underfunded fee-on-transfer funding.
- Beneficiary-only claims, role dashboards, explorer links, and real HSK Testnet transactions.

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
```

Each vault stores the issuer, beneficiary, reviewer, token, allocation, strategy, vesting schedule, milestone titles and amounts, eligibility provider, and revocable mode as immutable terms. Milestone approvals, claims, and the optional one-way revocation state are the only lifecycle changes after creation. Revocation freezes earned value and returns only unearned allocation to the issuer; non-revocable grants and previously deployed vaults remain permanent. Organization metadata is an optional off-chain product layer and never replaces contract state.

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

### Organizations product layer

Organizations are workspaces around existing GrantVaults. Supabase stores organization names, members, presentation role labels, GrantVault associations, descriptions, and future-facing template metadata. HSK remains authoritative for issuer, beneficiary, reviewer, token, allocation, strategy, schedules, milestone approval, unlocked/claimable/claimed amounts, eligibility, balances, and funds.

The canonical identities are lowercase EVM addresses for wallets, `(chain_id, vault_address)` for grants, and UUIDs for organizations. The current organization schema accepts HSK Testnet only (`chain_id = 133`). Product role labels such as `Treasury Reviewer` are presentation metadata; they do not grant permission to approve or claim.

Organization writes go through authenticated Next.js Route Handlers. The browser never uses the Supabase service-role key or writes organization tables directly. Workspace grant cards and queues join organization metadata with fresh GrantVault reads; they do not aggregate token balances or invent USD values.

### Unlock semantics

- `TIME`: `unlockedAmount = vestedByTime`.
- `MILESTONE`: `unlockedAmount = sum(approved milestone amounts)`.
- `HYBRID`: `unlockedAmount = min(vestedByTime, milestoneUnlockedAmount)`.

The cliff delays access but does not restart the vesting curve: before `start + cliff`, vesting is zero; at `start + duration`, the full allocation is vested; between those points, vesting is linear from `start`. Milestone amounts must sum exactly to the allocation, and no more than 20 milestones are accepted.

## Setup

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
```

Generate `AUTH_SECRET` with `openssl rand -base64 32` or another cryptographically random secret. Never prefix `SUPABASE_SERVICE_ROLE_KEY` or `AUTH_SECRET` with `NEXT_PUBLIC_`, commit them, or expose them to browser code. `AUTH_APP_URL` should be the canonical application origin when deployed behind a proxy; leave it at the local origin for local development.

Apply the tracked organization migration to the existing Supabase project from a machine with Supabase CLI access:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

The migration is [`supabase/migrations/20260912000000_hashvest_organizations.sql`](supabase/migrations/20260912000000_hashvest_organizations.sql). It creates `organizations`, `organization_members`, `organization_grants`, and server-only `auth_nonces`, adds constraints/indexes, enables RLS, and intentionally grants no public/anon/authenticated table policies. The application uses the service role only from server Route Handlers, while business authorization still checks the verified session and organization membership/ownership.

If a wallet reports HSK Testnet chain 133 but an approval shows `eth_getBlockByNumber` or a thirdweb support error, its saved RPC endpoint is unavailable. Use the **Use canonical HSK RPC** action in the app, or set the wallet network RPC to `https://testnet.hsk.xyz` with chain ID `133`.

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

The application is available at `http://localhost:3000`. Routes are `/` (landing), `/app` (organization entry point plus Issued / Received / Review dashboard), `/grants/new` (the shared five-step template-aware creation wizard: Template, Grant, Strategy, Conditions, Review), `/grants/<GrantVault address>` (public role-aware detail page), `/app/organizations/new`, `/app/organizations/<uuid>`, `/app/organizations/<uuid>/members`, `/app/organizations/<uuid>/grants`, and `/app/organizations/<uuid>/grants/new`. `/visual/dashboard` is a local-only deterministic fixture for the Playwright visual contract and is unavailable in production.

Wallet connection and workspace authentication are separate. After connecting an HSK Testnet wallet, click **Sign in to workspace** and approve one SIWE/EIP-4361 message. The server stores a five-minute, one-time nonce and issues a 24-hour HttpOnly, SameSite session cookie signed with `AUTH_SECRET`. If the connected wallet changes, organization reads and writes are disabled until the new wallet explicitly signs in; the application never silently signs or writes as the previous wallet.

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

The current deployment is written to `packages/web3/src/addresses/hsk-testnet.json` after a successful broadcast. The canonical explorer is [HSK Testnet Explorer](https://testnet-explorer.hskchain.net). The generated deployment artifact remains the source of truth; the current values are repeated below for demo convenience.

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
6. Switch to the reviewer wallet, connect, sign in explicitly, and open the organization review queue. **Review grant** opens the existing GrantDetail page, where the reviewer approves the pending milestone.
7. Switch to the beneficiary wallet, connect, sign in explicitly, and open the organization workspace. The grant appears with its live claimable amount; open GrantDetail and claim the real hvUSD.

The direct protocol flow remains available at `/grants/new`: enter raw beneficiary/reviewer addresses and create TIME, MILESTONE, or HYBRID grants without organization metadata. Existing GrantVaults can be attached later by an organization owner from the overview using **Link an existing GrantVault**. The server verifies bytecode, GrantVault reads, and the actual onchain issuer before association.

Every approval, creation, milestone, faucet, claim, and revocation transaction exposes an HSK Testnet explorer link. Use `/app` to move between role-specific grants.

For the controlled-wallet browser rehearsal, copy the public-address-only fixture and follow [`docs/browser-rehearsal.md`](docs/browser-rehearsal.md). `pnpm rehearsal:check` performs a read-only HSK/deployment/wallet readiness check; live browser execution and evidence are tracked separately in HAS-20.

## Security boundary

HashVest MVP has not been professionally audited. It targets HSK Testnet only, uses a faucet-mintable demo token, and should not hold production funds. Revocation is available only on explicitly revocable new vaults, is issuer-only and one-way, and preserves earned beneficiary entitlement; non-revocable and old vaults have no issuer withdrawal path. `DemoEligibilityProvider` is an adapter demonstration, not KYC or compliance.

## Roadmap

Hackathon P0 work, by milestone and owning layer:

| Milestone                               | Owner            |
| --------------------------------------- | ---------------- |
| M0 — Protocol/Cloud boundary & baseline | Cloud + Protocol |
| M1 — Global grant templates             | Cloud            |
| M2 — Revocation & protocol safety       | Protocol         |
| M3 — Lifecycle & funding health         | Cloud            |
| M4 — i18n, browser E2E & submission     | Cloud + Protocol |

Post-hackathon milestones M5–M7 cover P1–P3 work: milestone evidence, AI-assisted grant building and review, batch creation, TGE semantics, reviewer quorum, analytics, notifications, compliance and attestation adapters, an embedded SDK, and extraction of the protocol into a public `hashvest-protocol` repository. None of it is implemented in this MVP. New scope during the hackathon is a swap, never an addition — see the stop-adding-features rule in [`docs/architecture.md`](docs/architecture.md).

## Repository layout

```text
apps/web                 Cloud     Next.js wallet application
  lib/protocol           Protocol  chain-facing helpers, wagmi config, onchain roles, vault verification
  lib/cloud              Cloud     Supabase, SIWE sessions, organizations
  lib/shared             shared    layer-neutral utilities
packages/contracts       Protocol  Solidity contracts, Foundry tests, deployment script
packages/web3            Protocol  HSK chain config, generated ABIs, deployment data, sync scripts
packages/ui              shared    Shared UI package placeholder
packages/config          shared    Shared TypeScript and ESLint configuration
scripts                  shared    Repository-wide boundary checks
supabase/migrations      Cloud     Tracked product-context schema and RLS migration
```

Imports run one way: Cloud may depend on Protocol, never the reverse. `pnpm boundary:check` enforces this, along with service-role secret containment, protocol export drift, and documentation links. See [`docs/architecture.md`](docs/architecture.md).

Important organization implementation files include `apps/web/lib/auth` (SIWE challenge verification and signed sessions), `apps/web/lib/organizations` (validation, server authorization, HSK GrantVault verification, types, and browser API client), `apps/web/hooks/use-organizations.ts` (TanStack Query data layer), and `apps/web/components/organization-*` / `members-manager.tsx` (workspace UI). Organization lifecycle state remains derived from live protocol reads; it is not stored in Supabase.
