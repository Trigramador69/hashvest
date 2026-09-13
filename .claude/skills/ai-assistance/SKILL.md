---
name: ai-assistance
description: Build or change HashVest AI assistance while keeping model output advisory, validated against the protocol's own rules, provider-agnostic, and free of retained prompts or exposed secrets.
compatibility: Codex, Claude Code, and Agy with the AI Grant Builder boundary
---

# AI assistance

Use this skill for anything that sends text to a model or turns model output into product state: the AI Grant Builder (HAS-16/HAS-18), a future template generator (HAS-19), or a review copilot (HAS-17). The governing rule is that a model drafts and a human decides; AI never signs, funds, approves, claims, revokes, arbitrates, or selects a wallet.

## Procedure

1. Read the relevant Linear issue, [`docs/ai-grant-builder.md`](../../../docs/ai-grant-builder.md), and [`docs/architecture.md`](../../../docs/architecture.md). Inspect `apps/web/lib/shared/ai-grant-draft/`, `apps/web/lib/cloud/ai/`, and the wizard's preset path in `apps/web/lib/shared/grant-presets/`.
2. Express model output as a shape the product can already validate. A grant draft is a `GrantPreset`, so it passes `assertValidPreset` and reaches the wizard through `selectPreset`; `prepare()` in `apps/web/app/grants/new/page.tsx` stays the single source of truth for what is submitted onchain. Never add a submission path that only AI output uses.
3. Give the draft type no field that names an identity or moves value — beneficiary, reviewer, token, eligibility provider, start timestamp, revocability, or any transaction. A field that does not exist cannot be suggested.
4. Treat every provider response as hostile input. Re-derive it with a hand-written parser, drop unknown keys by name, redact addresses, 32-byte values, PEM keys, and seed phrases from prose, and re-run the product's own validator. A provider 200 is never validation.
5. Redact the prompt before it leaves the server and report what was removed. Keep retention at zero: no prompt, draft, or response text in Supabase, in logs, or in an error message.
6. Read provider secrets only in `apps/web/lib/cloud/ai/config.ts`, which carries `import "server-only"`. A new secret name belongs in `SECRET_NAMES` and `SECRET_ALLOWLIST` in `scripts/check-boundary.mjs`, in `apps/web/.env.local.example`, and in the `README.md` environment block. Never prefix one with `NEXT_PUBLIC_`.
7. Keep the provider optional and interchangeable. Call an OpenAI-compatible `/chat/completions` endpoint so `AI_BASE_URL` and `AI_MODEL` are the only difference between xAI, OpenRouter, DeepSeek, Zhipu, and a local server, and make an unavailable, unauthorized, slow, or incoherent provider degrade to the offline drafter rather than fail the request.
8. Bound the cost. Enforce prompt length, output tokens, a request timeout, and a per-wallet rate limit, and require a SIWE session so an anonymous caller cannot spend a provider budget.
9. Send machine codes, not sentences. The server returns adjustment and confirmation codes; the UI resolves `ai.adjustment.*` and `ai.confirm.*` in the active locale, and every new code needs `en`, `zh-CN`, and `es` entries.
10. Keep the AI path optional in the UI. Manual creation stays first-class, the disclaimer that human confirmation and protocol validation still apply is permanent rather than conditional, and a failed call leaves the wizard fully usable.
11. Test without a network. Inject `fetch`, the clock, and the rate limiter, and cover malformed output, every provider failure, prompt injection, secret non-exposure, and the refusal to produce a transaction action. Browser behavior belongs in `apps/web/tests/ai-grant-builder.spec.ts` with the endpoint stubbed.

## Completion criteria

Model output cannot reach the wizard through a weaker check than a hand-written preset passes, the user can inspect and edit every suggested value before submitting, provider failure and rate limiting still produce a usable draft, no prompt or output is retained, no secret appears in a bundle, a log, or a response, and the feature is fully operable with no provider configured.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, environment variable, draft schema field, adjustment code, provider behavior, retention rule, or user-facing AI copy changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
