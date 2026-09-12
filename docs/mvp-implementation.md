# HashVest MVP implementation contract

The supplied hackathon specification is the implementation scope. This document keeps the integration decisions and verification boundaries inspectable while the implementation spans contracts and the browser.

## Product behavior

An issuer creates and atomically funds an immutable ERC20 grant vault. Its beneficiary claims unlocked tokens. A fixed reviewer approves fixed milestones when applicable. Wallet dashboards discover grants from role arrays on the factory. No database, indexer, native-token grants, revocation, or production deployment is part of this change.

- TIME unlocks the linear amount vested from the start; the cliff delays access without restarting the curve.
- MILESTONE unlocks the sum of approved milestone allocations.
- HYBRID unlocks `min(time vested, approved milestone amount)`.
- Claims are beneficiary-only, eligibility-gated when configured, and cannot exceed allocation.
- Creation transfers the full allocation atomically. Transfer-tax underfunding reverts the whole transaction.
- The demo token uses 18 decimals. Its public faucet is explicitly testnet/demo functionality.

## Delivery and dependency order

1. Funded grant lifecycle through public Solidity APIs, including all three strategies, discovery, demo adapters, and Foundry tests.
2. Browser lifecycle through those same APIs: create/approve/fund, role discovery, review, and claim. The ABI interface is fixed before independent contract and browser work begins.
3. Integrated Testnet delivery: deterministic artifact exports, confirmed deployment metadata, chain guard, browser routes, real transaction smoke, documentation, independent review, and final checks. Depends on 1 and 2.

The first two areas use isolated Git worktrees with separate file ownership. The parent integrates them, runs the public workflow and checks the combined diff against the starting commit `fae19d17a5f026cbac603b9f7b8f46ba05e7a744`.

## Verification boundaries

Foundry tests exercise the public factory/vault/provider API, balances, roles, timestamps, immutable economics, fee-on-transfer rejection, and reentrancy. Pipeline tests reject wrong-chain, partial, reverted, or ambiguous broadcast metadata. Browser checks exercise real routes, network states, creation inputs, and contract reads. Testnet scripts check chain 133, bytecode, receipts, metadata, and discovery. Actual wallet transactions are reported separately from automated browser inspection.

CI requires no private keys or writable RPC. Deployment is explicitly authorized only on chain 133 after contract build and tests pass. Secrets stay in ignored environment files. Supabase stays unused.
