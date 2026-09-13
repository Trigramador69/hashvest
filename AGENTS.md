# HashVest agent contract

This file is the shared project contract for Codex, Claude Code, and Agy. Keep it concise; detailed procedures live in the canonical skills under `.agents/skills/` and in the linked repository docs.

## Start here

1. Read [`README.md`](README.md) for setup, scripts, product scope, and demo safety.
2. Read [`docs/architecture.md`](docs/architecture.md) before changing boundaries, contracts, persistence, or integration paths.
3. Read the relevant skill before acting. The canonical skills are in `.agents/skills/`; run `pnpm agents:check` if their state is uncertain.
4. Inspect the real checkout, package scripts, types, callers, tests, and current Linear issue when one exists before editing. An explicitly requested issue-free design branch records its scope in `design.md` and the final handoff.

## Non-negotiable project rules

- HSK is authoritative for value and permission. Supabase is product context. Cloud may depend on Protocol; Protocol must never depend on Cloud.
- Treat wallet addresses, hashes, token symbols, chain IDs, explorer URLs, private keys, cookies, and environment values as sensitive or technical data. Never print, commit, or hardcode secrets.
- Use package-local environment templates. Keep `DEPLOYER_PRIVATE_KEY` in `packages/contracts/.env` only; never put it in the web environment.
- Keep `SPONSORED_CLAIM_RELAYER_PRIVATE_KEY` server-only in `apps/web/.env.local`; organization sponsorship never gives Cloud authority over beneficiary, amount, nonce, or claim math.
- Do not reset databases, Docker volumes, Foundry state, or testnet state without explicit authorization.
- Do not broadcast, redeploy, resend funds, force-push, merge, or deploy to production without explicit authorization.
- Preserve generated files that are owned by tooling. In particular, do not remove the Next.js block in `apps/web/AGENTS.md`.
- The app shell exposes only Overview, Grants, and Settings. Organizations are managed under `/app/settings`; direct role-based grants live under `/app/grants`. Keep legacy organization paths as redirects only and do not add controls without a real destination or backing behavior.
- The public landing summary and `/plans` product-model page are presentation-only. Keep Protocol versus Cloud, Free / Team / Enterprise, and optional add-ons localized; label unavailable capabilities as roadmap and never add prices, checkout, billing, metering, entitlements, or claims that plan limits are enforced.
- AI drafts; humans decide. A model may never sign, fund, approve, claim, revoke, arbitrate, or select a wallet, and its output reaches the wizard only as an editable preset that passes the same validation a hand-written one does. Prompts and model output are never retained. Provider secrets are server-only and read in one allowlisted module. See [`docs/ai-grant-builder.md`](docs/ai-grant-builder.md).
- The shared grant wizard is a localized five-step flow (Template, Grant, Strategy, Conditions, Review); preset labels and editable suggestions must use the active locale while template keys and onchain values remain technical metadata. User-visible unknown errors use localized `errorMessage` fallbacks, while already-translated validation and wallet-guard errors are preserved.
- Organization-created grants use `HashVestFactory.createSponsoredGrant` and `SponsoredGrantVault` for one beneficiary-signed first claim; direct and pre-existing grants retain the beneficiary-paid manual `claim()` fallback. The Cloud may track policy/request/receipt state, but HSK remains authoritative.
- Prefer small, reversible changes and existing dependencies/tooling. Do not hide failed checks or weaken types.

## Delivery contract

- Work from a branch tied to the relevant Linear issue when one exists; an explicitly requested issue-free branch is acceptable for a documented design refactor.
- Make incremental, logically grouped commits. Do not add AI attribution or co-author trailers.
- Before creating or updating a PR, run `pnpm agents:sync`, `pnpm agents:check`, and `pnpm ci:check`.
- Report exact checks, results, blockers, manual verification, and remaining uncertainty. A local commit does not change a remote PR until it is pushed and verified.
- Keep the PR focused. A product change, its tests, and the documentation needed to keep the source of truth accurate belong together; unrelated cleanup does not.

## Mandatory documentation maintenance

**NECESSARY AND OBLIGATORY:** when a change alters any path, command, API, schema, environment variable, locale, architecture boundary, deployment behavior, CI step, or user-facing workflow referenced by an agent instruction, update the affected canonical skill(s), `README.md`, this `AGENTS.md`, and the relevant docs in the same change. Then run `pnpm agents:sync` and `pnpm agents:check`. Stale references mean the task is incomplete.

The sync command updates generated Claude adapters and the generated agent catalog below. The checker catches structural drift and dead links; reviewers must still check semantic freshness.

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
