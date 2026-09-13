# HashVest

**Open programmable-grants infrastructure on HashKey Chain.** An issuer creates and fully funds an ERC20 GrantVault with immutable terms; a beneficiary claims tokens as time, reviewer-approved milestones, or both make them available. A workspace layer lets an organization run that protocol with named members, review queues, and presets.

This is a hackathon MVP deployed on **HSK Chain Testnet**. It is unaudited, uses demo assets, and is not production custody software.

## At a glance

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

Important organization implementation files include `apps/web/lib/auth` (SIWE challenge verification and signed sessions), `apps/web/lib/organizations` (validation, server authorization, HSK GrantVault verification, types, and browser API client), `apps/web/hooks/use-organizations.ts` (TanStack Query data layer), and `apps/web/components/organization-*` / `members-manager.tsx` (workspace UI). Organization lifecycle state remains derived from live protocol reads; it is not stored in Supabase.
