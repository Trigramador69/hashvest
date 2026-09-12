---
name: ci-preflight
description: Reproduce the HashVest GitHub CI validation locally, diagnose failures without hiding them, and produce exact evidence before a pull request is created or updated.
compatibility: Codex, Claude Code, and Agy with the repository toolchain installed
---

# CI preflight

Use this skill before creating or updating a PR, after a broad change, or when CI and local results disagree.

## Procedure

1. Inspect the branch, diff, lockfile, workflow, and current environment. Do not report a green result based on an old run or only on compilation.
2. Run the single parity command from the repository root:

   ```bash
   pnpm ci:check
   ```

3. This command must cover dependency installation, agent configuration, lint, format, typecheck, workspace build, Foundry build, tests, generated ABI sync, and Protocol/Cloud boundary checks in the same order as `.github/workflows/ci.yml`.
4. If it fails, capture the first meaningful failure, inspect the cause, and make one bounded fix/retry when justified. Keep later failures visible; never add `|| true`, disable a check, or call a wrapper green when its underlying test failed.
5. For browser or testnet issues, add the relevant manual matrix and evidence separately. A local CI pass does not prove wallet, RPC, or live-chain behavior.

## Completion criteria

The PR report contains the exact `pnpm ci:check` result, relevant targeted checks, known environmental blockers, and any manual verification. A PR is not ready while this command is failing or unverified.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, workflow step, tool version, validation scope, or CI behavior changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
