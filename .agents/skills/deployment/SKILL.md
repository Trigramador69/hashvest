---
name: deployment
description: Plan, rehearse, execute, or verify HashVest HSK Testnet operations with chain guards, explicit transaction authority, safe secrets, and evidence-backed state changes.
compatibility: Codex, Claude Code, and Agy with an explicitly authorized testnet wallet and package-local environment
---

# Deployment and testnet operations

Use this skill for contract deployment, address or ABI synchronization, smoke tests, demo transactions, verification, or diagnosing an HSK Testnet operation.

## Procedure

1. Read the deployment sections of [`README.md`](../../../README.md), [`docs/architecture.md`](../../../docs/architecture.md), and the exact script under `packages/web3/scripts/` before running it.
2. Classify the action as read-only, local build/test, simulated, or broadcast. Treat deployment, demo transactions, faucet minting, grant creation, approvals, claims, and revocation as writes requiring explicit authorization for the exact action.
3. Confirm the actual chain ID is HSK Testnet `133`, the RPC endpoint is appropriate, and the deployer has enough HSK for gas. A selected network or wallet label is not proof that RPC reads work.
4. Keep `DEPLOYER_PRIVATE_KEY` only in `packages/contracts/.env`. The sponsored-claim relayer key is a separate server-only `SPONSORED_CLAIM_RELAYER_PRIVATE_KEY`; fund it with native HSK only after the organization policy and operational budget are approved. Never print environment values, private keys, signed payloads, or unnecessary personal data.
5. Use the existing commands and guards:

   ```bash
   pnpm contracts:deploy:testnet
   pnpm contracts:smoke:testnet
   pnpm contracts:sync:check
   pnpm contracts:verify:testnet
   pnpm rehearsal:check
   ```

   Read each script first and do not assume a command is read-only from its name.

6. After an authorized broadcast, report the gas payer, transaction hash, before/after onchain state, balance changes, explorer links, and the generated artifact or address file updated. Run contract sync checks before handing off.

## Failure handling

- Distinguish an RPC HTTP 429/Cloudflare 1015 or block-read failure with no transaction hash from a contract revert with a transaction hash.
- Do not redeploy or resend funds to repair an unavailable RPC endpoint. Change or repair the endpoint, then rerun a read-only readiness check.
- Stop on a wrong chain, missing key, unfunded deployer, failed receipt, unexpected bytecode, or address drift. Do not hide a partial broadcast.
- The current factory address may predate `createSponsoredGrant`. Treat a sponsored-flow deployment as a new authorized factory deployment plus ABI/address synchronization; never silently redeploy to make the UI path work.
- A protocol fee is design-only. Do not broadcast or sync a fee-aware factory from [`docs/protocol-fee-spec.md`](../../../docs/protocol-fee-spec.md); that requires a separately approved implementation and review.

## Completion criteria

The operation has an explicit authorization boundary, verified chain/receipt/artifacts, an evidence report, and no secret disclosure. Read-only diagnosis is complete without creating replacement contracts or transactions.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, chain/RPC rule, environment variable, deployment behavior, address artifact, verification endpoint, or evidence requirement changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
