---
name: workspace-setup
description: Set up or diagnose the HashVest monorepo safely, including Node, pnpm, Foundry, package-local environment templates, and reproducible dependencies.
compatibility: Codex, Claude Code, and Agy with shell access to the repository
---

# Workspace setup

Use this skill when starting work in a fresh checkout, recovering local tooling, or checking whether the workspace is ready for development.

## Procedure

1. Inspect `git status --short --branch`, the root `package.json`, `pnpm-lock.yaml`, workspace files, and the relevant package scripts before changing anything.
2. Confirm the toolchain against the repository contract: Node.js 22+, pnpm 10+, and `forge`, `cast`, and optionally `anvil`. Report version mismatches instead of silently changing the user's runtime.
3. Install JavaScript dependencies with `pnpm install --frozen-lockfile`.
4. Use the package-local templates: copy `apps/web/.env.local.example` to `apps/web/.env.local` and `packages/contracts/.env.example` to `packages/contracts/.env` only when the target does not already exist. Never print or inspect values from real environment files.
5. From `packages/contracts`, install missing Foundry libraries as plain directories:

   ```bash
   forge install --no-git --shallow foundry-rs/forge-std@v1.9.7 OpenZeppelin/openzeppelin-contracts@v5.4.0
   ```

6. Run `pnpm agents:check` and the targeted package checks before declaring setup complete. Use `pnpm ci:check` when the workspace must be PR-ready.

## Safety boundaries

- Do not create a root `.env`, put a private key in `apps/web/.env.local`, or expose `SUPABASE_SERVICE_ROLE_KEY` or `AUTH_SECRET` to browser code.
- Do not reset Supabase, Docker, Foundry state, or local data as a generic repair. Ask for explicit authorization before destructive recovery.
- Do not install global packages or change lockfiles to fix a local mismatch without establishing that the repository requires it.

## Completion criteria

Report the detected versions, which dependency/template steps were already satisfied, any missing optional service configuration, and the exact checks that passed or remain blocked.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, API, environment variable, dependency version, setup behavior, or CI step changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
