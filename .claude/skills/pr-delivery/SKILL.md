---
name: pr-delivery
description: Deliver focused HashVest work through incremental commits, evidence-backed review, and a validated pull-request workflow, with Linear linkage when required by the requester.
compatibility: Codex, Claude Code, and Agy with Git access; remote publication remains explicitly authorized
---

# Incremental PR delivery

Use this skill for branch preparation, commit organization, PR readiness, PR review, or handoff.

## Procedure

1. Identify the Linear issue and acceptance criteria when one exists. If the requester explicitly opts out, record the acceptance criteria in the branch name, design source of truth, and final handoff. Inspect the current branch, upstream refs, worktree, and recent history before deciding what belongs in the change.
2. Keep the branch focused and make small, logically grouped commits. Each commit should be understandable, reversible, and validated before the next slice. Never add AI attribution or co-author trailers.
3. For each slice, run the narrowest useful tests. Before creating or updating a PR, run `pnpm agents:sync`, `pnpm agents:check`, and `pnpm ci:check` from the repository root.
4. Review the final diff for scope creep, secret exposure, authorization regressions, stale docs, generated-file drift, missing tests, and accidental changes to user data or deployment state. For sponsored actions, require evidence of actor/relayer/payload binding, policy limits, idempotent request state, relayer-failure recovery, manual fallback, and the explicit no-broadcast deployment boundary.
5. Write the PR with the Linear issue when applicable, behavior changed, source-of-truth docs, exact checks and results, manual/browser/testnet evidence, limitations, and rollback notes where applicable.
6. Push, create, merge, or force-update a remote PR only when that exact remote action is authorized. After publishing, verify the remote branch/PR state instead of inferring it from local commits.

## Completion criteria

The branch has focused incremental commits, a clean reviewed diff, passing preflight, a truthful PR body, and explicit publication status. Local readiness and remote state are reported separately.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, branch convention, PR requirement, Linear workflow, validation rule, or publication behavior changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
