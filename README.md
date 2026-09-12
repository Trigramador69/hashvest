# Hashvest

Minimal Web3 hackathon workspace for experimenting with on-chain workflows on HashKey Chain (HSK). The repository currently contains development scaffolding only: no grants, vesting, token, compliance, dashboard, authentication, or other product logic is implemented.

## Architecture

- `apps/web`: Next.js App Router application with Tailwind CSS, shadcn/ui primitives, RainbowKit, wagmi, viem, and an optional Supabase client.
- `packages/web3`: small shared package containing HSK chain definitions, the development contract ABI, and empty deployment-address placeholders.
- `packages/contracts`: Foundry project containing one trivial `DevelopmentRegistry` contract, one unit test, and one deployment script.
- `packages/ui`: intentionally empty shared UI package reserved for components only when sharing becomes useful.
- `packages/config`: shared TypeScript and ESLint configuration.
- `supabase/migrations`: empty migration directory reserved for a future data model.

HSK Testnet is the first configured chain and is the development default. HSK Mainnet is also available.

| Network     | Chain ID | RPC                       | Explorer                           |
| ----------- | -------: | ------------------------- | ---------------------------------- |
| HSK Mainnet |      177 | `https://mainnet.hsk.xyz` | `https://hashkey.blockscout.com`   |
| HSK Testnet |      133 | `https://testnet.hsk.xyz` | `https://testnet-explorer.hsk.xyz` |

## Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer
- Foundry (`forge`, `cast`, and `anvil`) for contract work
- A WalletConnect Cloud project ID for real wallet connections
- HSK Testnet HSK for deploying the example contract

## Installation

```bash
pnpm install
cd packages/contracts
forge install foundry-rs/forge-std@v1.9.7 OpenZeppelin/openzeppelin-contracts@v5.4.0 --no-commit
cd ../..
```

The Foundry dependencies are intentionally ignored in Git and can be installed again on a fresh checkout. CI performs the same dependency installation when the directories are absent.

Create each local environment file from the template owned by the package that uses it:

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp packages/contracts/.env.example packages/contracts/.env
```

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `apps/web/.env.local` for real wallet connections. Supabase variables can remain empty until Supabase is needed. Keep `DEPLOYER_PRIVATE_KEY` only in `packages/contracts/.env`; it is never needed by the web app.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

Run the web application at `http://localhost:3000`. The page is intentionally limited to a readiness message, a shadcn Card and Button, a RainbowKit connect control, the connected address, and the selected chain.

Contract commands:

```bash
pnpm contracts:build
pnpm contracts:test
pnpm contracts:deploy:testnet
```

## Deploying the example contract to HSK Testnet

1. Install the Foundry dependencies if they are not present.
2. Copy `packages/contracts/.env.example` to `packages/contracts/.env`.
3. Set `DEPLOYER_PRIVATE_KEY` to a funded development wallet. Do not use a production key.
4. Confirm `HSK_TESTNET_RPC_URL` if a custom RPC is required.
5. Run:

```bash
pnpm contracts:deploy:testnet
```

The script broadcasts `DevelopmentRegistry` and prints its address. If deployment succeeds, put that address in `packages/web3/src/addresses/index.ts` for frontend experiments. No private key is read by the web app.

Block explorer verification is intentionally not automated yet; the deployment command is the only contract-network operation included in this scaffold.

## Repository structure

```text
hashvest/
├── apps/
│   └── web/
├── packages/
│   ├── config/
│   ├── contracts/
│   ├── ui/
│   └── web3/
├── supabase/
│   └── migrations/
├── .github/
│   └── workflows/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Business requirements and the eventual product architecture are deliberately postponed so the first implementation can be chosen from evidence gathered during the hackathon.
