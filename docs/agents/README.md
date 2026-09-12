# Agent workflow

HashVest keeps one project workflow for Codex, Claude Code, and Agy. [`AGENTS.md`](../../AGENTS.md) is the concise shared contract; the canonical procedures live under [` .agents/skills/`](../../.agents/skills/) (without the space in the actual link target).

## Choose a workflow

- Workspace setup: [`workspace-setup`](../../.agents/skills/workspace-setup/SKILL.md)
- Architecture and boundaries: [`architecture`](../../.agents/skills/architecture/SKILL.md)
- Deployment and testnet operations: [`deployment`](../../.agents/skills/deployment/SKILL.md)
- Small current-surface UI/UX changes: [`ui-ux`](../../.agents/skills/ui-ux/SKILL.md)
- Translation and locale work: [`localization`](../../.agents/skills/localization/SKILL.md)
- Local CI simulation: [`ci-preflight`](../../.agents/skills/ci-preflight/SKILL.md)
- Incremental PR delivery: [`pr-delivery`](../../.agents/skills/pr-delivery/SKILL.md)
- Updating skills and documentation: [`agent-maintenance`](../../.agents/skills/agent-maintenance/SKILL.md)

## Required commands

```bash
pnpm agents:sync
pnpm agents:check
pnpm ci:check
```

`agents:sync` updates generated Claude adapters and the generated catalog in the root README and `AGENTS.md`. `agents:check` verifies metadata, mirrors, required maintenance language, and documentation links. `ci:check` runs the same repository validation sequence used by GitHub Actions.

## Compatibility

See [`compatibility.md`](compatibility.md) for the supported file topology and the official configuration references. Do not add tool-specific instructions that contradict the shared contract.
