---
name: agent-maintenance
description: Keep HashVest agent instructions, skills, generated adapters, README, architecture docs, and CI contracts synchronized whenever repository behavior or references change.
compatibility: Codex, Claude Code, and Agy with repository write access
---

# Agent and documentation maintenance

Use this skill whenever an implementation change affects a command, path, API, schema, environment variable, locale, architecture boundary, deployment flow, CI step, or user-facing workflow referenced by agent guidance.

## Mandatory contract

**NECESSARY AND OBLIGATORY:** update the affected canonical skill(s), `README.md`, `AGENTS.md`, and relevant source-of-truth documentation in the same change. Do not leave a known stale reference for a later cleanup PR.

## Procedure

1. Search the repository for the changed path, command, symbol, environment variable, locale, and old behavior. Inspect the implementation and its callers before editing prose. For protocol extensions, include the generated ABI surface, deployment caveat, server-only secret boundary, and user-facing fallback in that search.
2. Update canonical skills under `.agents/skills/`, not `.claude/skills/`. Keep procedures focused and remove obsolete instructions rather than appending contradictory history.
3. Update `README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/agents/`, or product runbooks when their source-of-truth content changed. Preserve the generated Next.js block in `apps/web/AGENTS.md`.
4. Run `pnpm agents:sync` to regenerate Claude skill copies and the root agent catalogs.
5. Run `pnpm agents:check` to prove frontmatter, mirrors, required maintenance language, generated catalogs, and relative links are synchronized.
6. Include the maintenance work in the same focused commit/PR as the implementation change, then run `pnpm ci:check` before handoff.

## What automation can and cannot prove

`agents:sync` mechanically updates generated copies and catalogs. `agents:check` proves structural consistency and links. Neither can infer every semantic relationship between arbitrary code and prose, so the responsible agent and reviewer must inspect meaning and update documentation deliberately.

## Completion criteria

No changed reference is stale, all generated outputs are synchronized, the checker and CI preflight pass, and the PR explains any intentionally deferred documentation update as a blocker rather than silently omitting it.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, API, schema, environment variable, locale, documentation source, generated-file rule, or maintenance procedure changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
