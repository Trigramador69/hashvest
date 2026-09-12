# HashVest

HashVest is a programmable grant and vesting protocol for HashKey Chain. An issuer creates and fully funds an immutable ERC20 GrantVault; a beneficiary claims tokens as time, milestone approval, or both make them available.

This is a hackathon MVP for HSK Testnet. It is unaudited, uses demo assets, and is not production custody software.

## MVP features

- Time vesting with a start timestamp, cliff, and linear duration.
- Milestone grants with fixed amounts approved by a designated reviewer.
- Hybrid grants where both conditions constrain the claim: `unlocked = min(time vested, approved milestone amount)`.
- Optional `IEligibilityProvider` adapter, including a clearly labeled administrator-controlled demo allowlist.
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

Each vault stores the issuer, beneficiary, reviewer, token, allocation, strategy, vesting schedule, milestone titles and amounts, and optional eligibility provider as immutable terms. Only milestone approval and claimed amount change after creation. The protocol has no issuer withdrawal, revocation, upgradeability, indexer, or native HSK grant. Organization metadata is an optional off-chain product layer and never replaces contract state.

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

The application is available at `http://localhost:3000`. Routes are `/` (landing), `/app` (organization entry point plus Issued / Received / Review dashboard), `/grants/new` (raw-address four-step creation wizard), `/grants/<GrantVault address>` (public role-aware detail page), `/app/organizations/new`, `/app/organizations/<uuid>`, `/app/organizations/<uuid>/members`, `/app/organizations/<uuid>/grants`, and `/app/organizations/<uuid>/grants/new`.

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
| HashVestFactory         | [`0xD854A966Bb680710Ae31a834AEC527D3A5d074e7`](https://testnet-explorer.hskchain.net/address/0xD854A966Bb680710Ae31a834AEC527D3A5d074e7) | [`0x9a0d3465d6671f4206bd71c42a2e247b14c33db30e36630df855fc712a52c1f1`](https://testnet-explorer.hskchain.net/tx/0x9a0d3465d6671f4206bd71c42a2e247b14c33db30e36630df855fc712a52c1f1) |
| DemoToken (`hvUSD`)     | [`0x757DDb21F99B9E949a62127603F94B1AAe80d600`](https://testnet-explorer.hskchain.net/address/0x757DDb21F99B9E949a62127603F94B1AAe80d600) | [`0x22da9c596bd23f780393a921583832d0101ae2a40b6677e3c908a29846d1fa1f`](https://testnet-explorer.hskchain.net/tx/0x22da9c596bd23f780393a921583832d0101ae2a40b6677e3c908a29846d1fa1f) |
| DemoEligibilityProvider | [`0x065804b3822B0A896fb2D227489476038d489048`](https://testnet-explorer.hskchain.net/address/0x065804b3822B0A896fb2D227489476038d489048) | [`0x6f0fc72ebfa6d872d170e6c909fcce0d74241b4b3d6724359baf2ba6566869fb`](https://testnet-explorer.hskchain.net/tx/0x6f0fc72ebfa6d872d170e6c909fcce0d74241b4b3d6724359baf2ba6566869fb) |

The latest clean live lifecycle evidence is recorded in [`docs/testnet-demo.json`](docs/testnet-demo.json), including the TIME, MILESTONE, and HYBRID grant vaults and every public transaction hash.

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

Every approval, creation, milestone, faucet, and claim transaction exposes an HSK Testnet explorer link. Use `/app` to move between role-specific grants.

## Security boundary

HashVest MVP has not been professionally audited. It targets HSK Testnet only, uses a faucet-mintable demo token, and should not hold production funds. The contracts have no revocation or emergency issuer withdrawal path by design. `DemoEligibilityProvider` is an adapter demonstration, not KYC or compliance.

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

Important organization implementation files include `apps/web/lib/auth` (SIWE challenge verification and signed sessions), `apps/web/lib/organizations` (validation, server authorization, HSK GrantVault verification, types, and browser API client), `apps/web/hooks/use-organizations.ts` (TanStack Query data layer), and `apps/web/components/organization-*` / `members-manager.tsx` (workspace UI). No Solidity protocol contract was changed for this layer.
