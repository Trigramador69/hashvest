# Agent CLI compatibility

The repository uses the open Agent Skills convention: each skill is a directory containing a `SKILL.md` with `name` and `description` frontmatter. The canonical project skills are under `.agents/skills/`.

## Supported topology

| Agent       | Project instructions                                                                         | Project skills    | Source of truth            |
| ----------- | -------------------------------------------------------------------------------------------- | ----------------- | -------------------------- |
| Codex       | `AGENTS.md` from repository root to the working directory                                    | `.agents/skills/` | `.agents/` and `AGENTS.md` |
| Claude Code | root `CLAUDE.md` imports `@AGENTS.md`; nested `apps/web/CLAUDE.md` remains a Next.js adapter | `.claude/skills/` | `.agents/` and `AGENTS.md` |
| Agy         | `AGENTS.md` in the workspace                                                                 | `.agents/skills/` | `.agents/` and `AGENTS.md` |

The `.claude/skills/` files are generated copies. Edit the canonical file, then run `pnpm agents:sync`; never make a one-tool-only skill change. The generated catalog in `README.md` and `AGENTS.md` is updated by the same command.

## Maintenance contract

Every skill includes the exact **NECESSARY AND OBLIGATORY** rule: if a referenced path, command, API, schema, environment variable, locale, architecture boundary, deployment behavior, or CI step changes, update the affected skills and project docs in the same change. Run `pnpm agents:sync` and `pnpm agents:check` before considering the work complete.

This automation can prove that generated adapters and structural references are synchronized. It cannot safely infer every semantic documentation change from arbitrary source-code edits, so semantic freshness remains an explicit agent and reviewer acceptance criterion.

## Official references

- [Agent Skills specification](https://agentskills.io/specification)
- [Codex `AGENTS.md` instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [Claude Code memory](https://code.claude.com/docs/en/memory)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Antigravity skills](https://antigravity.google/docs/skills)
