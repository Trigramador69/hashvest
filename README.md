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
   |
wagmi / viem
   |
HSK Testnet (chain 133)
   |
HashVestFactory ---- role discovery arrays
   |
GrantVault #1, #2, #3 ...
```

Each vault stores the issuer, beneficiary, reviewer, token, allocation, strategy, vesting schedule, milestone titles and amounts, and optional eligibility provider as immutable terms. Only milestone approval and claimed amount change after creation. There is no issuer withdrawal, revocation, upgradeability, database, indexer, or native HSK grant.

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
forge install foundry-rs/forge-std@v1.9.7 OpenZeppelin/openzeppelin-contracts@v5.4.0 --no-commit
cd ../..
cp apps/web/.env.local.example apps/web/.env.local
cp packages/contracts/.env.example packages/contracts/.env
```

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect connections. Browser injected wallets remain available when it is blank. Keep `DEPLOYER_PRIVATE_KEY` only in `packages/contracts/.env`; it is never read by the web application.

Run the app and checks:

```bash
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

The application is available at `http://localhost:3000`. Routes are `/` (landing), `/app` (Issued / Received / Review dashboard), `/grants/new` (four-step creation wizard), and `/grants/<GrantVault address>` (role-aware detail page).

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

Current verified HSK Testnet deployment (chain 133):

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

If Blockscout rejects the automated request, retry the command or verify the three source contracts manually at the explorer with the constructor arguments recorded in the broadcast. Verification failure does not invalidate deployment.

## Demo flow

1. Open the app with three wallets available on HSK Testnet (issuer, reviewer, beneficiary).
2. Use **Get demo hvUSD** on `/app` or `/grants/new` from the issuer wallet.
3. Open **Create grant**, choose **Use demo hvUSD**, select **Hybrid**, and enter the beneficiary and reviewer addresses.
4. Add milestones whose amounts total the allocation, choose a short time schedule for the demo, review the immutable terms, and approve spending.
5. Open the created vault. Switch to the reviewer wallet and approve a pending milestone; the detail page refreshes real onchain values.
6. Switch to the beneficiary wallet and claim the displayed amount. The token balance and claimed metric update after confirmation.

Every approval, creation, milestone, faucet, and claim transaction exposes an HSK Testnet explorer link. Use `/app` to move between role-specific grants.

## Security boundary

HashVest MVP has not been professionally audited. It targets HSK Testnet only, uses a faucet-mintable demo token, and should not hold production funds. The contracts have no revocation or emergency issuer withdrawal path by design. `DemoEligibilityProvider` is an adapter demonstration, not KYC or compliance.

## Roadmap

Possible future extensions are revocable grants, batch creation, reusable templates, and real attestation or compliance adapters. They are not implemented in this MVP.

## Repository layout

```text
apps/web                 Next.js wallet application
packages/contracts       Solidity contracts, Foundry tests, deployment script
packages/web3            HSK chain config, generated ABIs, deployment data, sync scripts
packages/ui               Shared UI package placeholder
packages/config           Shared TypeScript and ESLint configuration
supabase/migrations       Existing unused scaffold
```
