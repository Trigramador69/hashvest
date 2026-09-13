---
name: architecture
description: Design or review HashVest changes while preserving the Cloud, web3, Protocol, Supabase, and HSK authority boundaries documented by the repository.
compatibility: Codex, Claude Code, and Agy with repository and issue-tracker access
---

# Architecture

Use this skill for new modules, data flows, APIs, persistence, contracts, cross-layer imports, or any decision that could change the system boundary.

## Procedure

1. Read [`docs/architecture.md`](../../../docs/architecture.md), [`README.md`](../../../README.md), the relevant source, tests, and (when present) the Linear issue before proposing a design. An explicitly requested issue-free design branch is valid when its scope is documented.
2. State the ownership and authority of every new field or operation. HSK remains authoritative for value and permission; Supabase remains product context.
3. Preserve the one-way integration path: Cloud → `@hashvest/web3` → Protocol → HSK. `packages/contracts`, `packages/web3`, `apps/web/lib/protocol`, and `apps/web/lib/shared` must not acquire Cloud dependencies.
4. Prefer an existing seam and the smallest change. Record material alternatives, invariants, and migration or rollback implications in the relevant design document or ADR before implementation.
5. Respect the hackathon scope: do not split the repository or add deferred P1/P2/P3 product functionality. Use a Linear issue for ideas outside the active milestone unless the requester explicitly asks to defer issue tracking.
6. For relayed claims, bind every beneficiary intent field (vault, beneficiary, amount, nonce, deadline, relayer) in the protocol, keep the relayer key server-only, make policy/request state idempotent, and preserve a manual beneficiary-paid fallback.
7. Treat milestone evidence as private Cloud/Supabase metadata associated with `(chain_id, vault_address, milestone_index)`. It must not change reviewer, approval, beneficiary, allocation, or any other HSK authority, and the public GrantDetail context endpoint must not return it.
8. Validate with `pnpm boundary:check`, focused tests, and the full preflight when the change is ready for a PR.

## Review questions

- Can the Protocol still operate without Cloud or Supabase?
- Does any presentation label accidentally become permission?
- Is a value derived live from HSK rather than cached as authoritative Cloud data?
- Are authentication, signing, persistence, and external inputs validated at their boundaries?
- Does a sponsored operation prove beneficiary intent onchain, prevent replay/duplicate broadcast, and expose a safe fallback when the relayer or Cloud is unavailable?
- Does the proposed path match the extraction boundary recorded in `packages/web3/protocol-surface.json`?

## Completion criteria

The design has an explicit owner, dependency direction, failure behavior, validation plan, Linear scope, and updated source-of-truth documentation. No architecture claim is accepted on compilation alone.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, API, schema, architecture boundary, authority rule, or scope rule changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
