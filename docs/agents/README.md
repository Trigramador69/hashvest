# Agent workflow

HashVest keeps one project workflow for Codex, Claude Code, and Agy. [`AGENTS.md`](../../AGENTS.md) is the concise shared contract; the canonical procedures live under [`.agents/skills/`](../../.agents/skills/).

## Choose a workflow

<!-- BEGIN:hashvest-agent-catalog -->

### Agent workflow catalog

Canonical skills live in `.agents/skills/`; Claude adapters are generated in `.claude/skills/`.

- [`agent-maintenance`](../../.agents/skills/agent-maintenance/SKILL.md) — Keep HashVest agent instructions, skills, generated adapters, README, architecture docs, and CI contracts synchronized whenever repository behavior or references change.
- [`architecture`](../../.agents/skills/architecture/SKILL.md) — Design or review HashVest changes while preserving the Cloud, web3, Protocol, Supabase, and HSK authority boundaries documented by the repository.
- [`ci-preflight`](../../.agents/skills/ci-preflight/SKILL.md) — Reproduce the HashVest GitHub CI validation locally, diagnose failures without hiding them, and produce exact evidence before a pull request is created or updated.
- [`deployment`](../../.agents/skills/deployment/SKILL.md) — Plan, rehearse, execute, or verify HashVest HSK Testnet operations with chain guards, explicit transaction authority, safe secrets, and evidence-backed state changes.
- [`localization`](../../.agents/skills/localization/SKILL.md) — Add or update HashVest localized strings for selected languages using the typed English source dictionary, safe fallbacks, preserved technical literals, and focused validation.
- [`pr-delivery`](../../.agents/skills/pr-delivery/SKILL.md) — Deliver focused HashVest work through incremental commits, evidence-backed review, and a validated pull-request workflow, with Linear linkage when required by the requester.
- [`ui-ux`](../../.agents/skills/ui-ux/SKILL.md) — Implement the HashVest design specification as accessible, responsive UI while preserving wallet, session, transaction, analytics authority, and localization behavior.
- [`workspace-setup`](../../.agents/skills/workspace-setup/SKILL.md) — Set up or diagnose the HashVest monorepo safely, including Node, pnpm, Foundry, package-local environment templates, and reproducible dependencies.

After changing a skill, run `pnpm agents:sync` and `pnpm agents:check`.
<!-- END:hashvest-agent-catalog -->

## Required commands

```bash
pnpm agents:sync
pnpm agents:check
pnpm ci:check
```

`agents:sync` updates generated Claude adapters and the generated catalog in the root README and `AGENTS.md`. `agents:check` verifies metadata, mirrors, required maintenance language, and documentation links. `ci:check` runs the same repository validation sequence used by GitHub Actions.

## Compatibility

See [`compatibility.md`](compatibility.md) for the supported file topology and the official configuration references. Do not add tool-specific instructions that contradict the shared contract.
