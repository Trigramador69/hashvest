# HashVest agent skills

`.agents/skills/` is the canonical project skill directory. It follows the open Agent Skills layout so Codex and Agy can discover the same workflows. Claude Code receives generated copies under `.claude/skills/`.

Use the skill whose description matches the task, then read its complete `SKILL.md` before acting. Skills are intentionally focused: project-wide policy belongs in [`AGENTS.md`](../AGENTS.md), product setup and scope in [`README.md`](../README.md), and architectural authority in [`docs/architecture.md`](../docs/architecture.md).

## Maintenance

Do not edit `.claude/skills/` directly. After adding or changing a canonical skill, run:

```bash
pnpm agents:sync
pnpm agents:check
```

Every skill contains the mandatory documentation-maintenance contract. If a referenced implementation path, command, API, schema, locale, deployment behavior, or CI rule changes, update the relevant skill and project docs in the same PR.

The generated adapters are committed so a fresh checkout works in all supported agent CLIs without relying on local symlinks or global configuration.
