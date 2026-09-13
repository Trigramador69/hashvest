# AI Grant Builder — provider, schema, and privacy boundary

The definition HAS-16 asks for, and the contract HAS-18 builds on. Natural-language grant creation is a real onboarding improvement and a real risk: an AI integration must never become an unreviewed financial actor. This document states exactly what the integration may do, what it structurally cannot do, and what happens when it fails.

The governing rule is one sentence: **a model drafts, a human decides, and HSK stays authoritative for every value and every permission.**

## The central decision

A draft is a **preset**, not a grant.

The wizard already accepts editable presets — Builder, Employee, Advisor, Ecosystem — through a validated path built for HAS-8 and HAS-11. Model output is shaped into the same `GrantPreset` type and travels the same way:

```
prompt
  → redact                       strip anything private before it leaves us
  → rate limit                   bound the cost of a paid API
  → provider  ⟋ offline drafter  whichever is available
  → parse                        re-derive every field from untrusted input
  → normalize                    correct what is impossible, and report it
  → assertValidPreset            the gate a hand-written preset passes
  → selectPreset                 the wizard's existing preset path
  → the user edits
  → validateGrant / prepare      unchanged, and still the only source of truth
  → createGrant                  the user's own wallet, the user's own click
```

There is no submission path that only AI output uses. That is the whole safety argument: model output cannot reach the chain through a weaker check than a preset written by hand, because it does not reach the chain by any other route.

## What a draft can express

`AiGrantDraft` in `apps/web/lib/shared/ai-grant-draft/schema.ts`:

| Field                  | Meaning                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `strategy`             | `0` TIME, `1` MILESTONE, `2` HYBRID — the same indexes as `UnlockStrategy` in `GrantTypes.sol`           |
| `title`, `description` | Prose, in the reader's locale, editable                                                                  |
| `allocation`           | Decimal token amount as a string                                                                         |
| `timing`               | `unit` (`"60"`, `"3600"`, `"86400"` seconds), `cliff`, `duration`, `realWorldNote`; `null` for MILESTONE |
| `milestones`           | Titles and whole-number percentages summing to 100; `null` for TIME                                      |
| `assumptions`          | Every non-obvious choice made for the user                                                               |
| `unsupported`          | What the request asked for that a template cannot express                                                |

## What a draft cannot express

The type has **no field** for a beneficiary, a reviewer, a token, an eligibility provider, a start timestamp, revocability, or any transaction. This is the privacy and authority boundary, and it is structural rather than procedural: a suggestion that cannot be represented cannot be applied, cannot be reviewed into existence by a tired operator, and cannot be smuggled through by a prompt injection.

Explicitly out of scope, per HAS-16 and HAS-18: automatic wallet signatures, funding, approvals, claims, revocation, or transaction submission; AI-controlled reviewer decisions, arbitration, compliance conclusions, or source-of-truth financial state; and sending private keys or secrets to a model.

## Provider contract

Any OpenAI-compatible `/chat/completions` endpoint. No SDK and no new dependency: xAI, Groq, OpenRouter, DeepSeek, Zhipu, and a local Ollama or LM Studio server all speak the same shape, so switching provider is two environment variables.

| Variable        | Default               | Notes                                                                        |
| --------------- | --------------------- | ---------------------------------------------------------------------------- |
| `AI_API_KEY`    | _(unset)_             | Server-only. Unset disables the provider; it does not disable the feature.   |
| `AI_BASE_URL`   | `https://api.x.ai/v1` | Trailing slashes are trimmed.                                                |
| `AI_MODEL`      | `grok-4.6`            |                                                                              |
| `AI_MAX_TOKENS` | `2500`                | Output ceiling for one draft. Lower it only when a tier rejects the request. |

`apps/web/lib/cloud/ai/config.ts` is the only module allowed to read `AI_API_KEY`; `scripts/check-boundary.mjs` fails CI otherwise, and fails outright on a `NEXT_PUBLIC_` prefix. Everything downstream receives an already-configured object, so no other file can put the key into a bundle, a log, or an error message.

The request carries `response_format: { type: "json_schema" }` with the draft schema. That is a hint, not a guarantee — providers honour it to different degrees — so the answer is re-parsed and re-validated from scratch regardless.

### Verified configurations

Provider-agnostic is a claim worth testing rather than asserting. Measured against live endpoints, drafting the HAS-16 example prompt in English, 简体中文 and Español:

| `AI_BASE_URL` / `AI_MODEL`                                                | Result                                                                                                                                                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `https://api.groq.com/openai/v1` · `openai/gpt-oss-20b`                   | **Works** at the default 2500-token ceiling. Fails at 700.                                                                                                                           |
| `https://api.groq.com/openai/v1` · `openai/gpt-oss-120b`                  | **Works** at either ceiling.                                                                                                                                                         |
| `https://api.groq.com/openai/v1` · `qwen/qwen3.8-27b`, `qwen/qwen3.6-27b` | Rejected: Groq's free tier caps these at 1000 output tokens per minute and refuses a larger `max_tokens` with a `429`. Lower `AI_MAX_TOKENS` to fit, and expect truncated reasoning. |
| `https://api.groq.com/openai/v1` · `groq/compound-mini`                   | Rejected: `400 … does not support response format json_schema`.                                                                                                                      |

Three things that cost an afternoon to learn, recorded so they do not have to be learned twice:

- **The output ceiling is a capability, not just a cost knob.** A reasoning model spends its budget thinking before it emits any content, and one that runs out mid-thought returns _nothing_: Groq answers `400 json_validate_failed` with an empty `failed_generation`. `gpt-oss-20b` fails every request at 700 tokens and answers correctly at 2500. The ceiling moved to 2500 and became overridable through `AI_MAX_TOKENS` for tiers that cap it lower.
- **Pick a model that honours `response_format: json_schema`.** One that does not never gets past the parser, so the feature degrades to offline drafting permanently and silently. Check `source` on a draft — `"model"` or `"fallback"` — before concluding a provider is configured correctly.
- **A model that ignores the schema still cannot produce a bad grant.** Qwen returned a schema-shaped object with `", "` in `timing.cliff` and `timing.duration`; the parser refused it and the user got an offline draft rather than a grant with a nonsense schedule. This is why a provider `200` is never treated as validation.

A flaky free tier is survivable and expected: Groq answers `5xx` intermittently under bursts, those requests fall back, and the wizard stays usable. A mix of `source: "model"` and `source: "fallback"` on a free tier is normal, not a misconfiguration.

An invalid key is not reliably a `401`, either. xAI answers one with `400 {"code":"invalid-argument"}`, which this code classifies as `unavailable`. The user-visible behaviour is identical — a fallback draft — but an `unavailable` in a log does not by itself mean the provider is down.

### Limits and cost guardrails

| Limit               | Value            | Where                                                    |
| ------------------- | ---------------- | -------------------------------------------------------- |
| Prompt length       | 8–400 characters | `AI_PROMPT_MIN_LENGTH` / `AI_PROMPT_MAX_LENGTH`          |
| Output tokens       | 2500             | `AI_MAX_OUTPUT_TOKENS`, overridable with `AI_MAX_TOKENS` |
| Request timeout     | 15 s             | `AI_REQUEST_TIMEOUT_MS`                                  |
| Temperature         | 0.2              | `AI_TEMPERATURE`                                         |
| Allocation ceiling  | 1000             | `AI_MAX_ALLOCATION` — one faucet click mints 1,000 hvUSD |
| Milestones          | 20               | the vault's own `MAX_MILESTONES`                         |
| Schedule length     | 10 years         | `AI_MAX_SCHEDULE_SECONDS`                                |
| Requests per wallet | 5/minute, 40/day | `apps/web/lib/cloud/ai/rate-limit.ts`                    |

The endpoint requires a SIWE session. That is not authorization — the response grants nothing — it is the rate-limit identity and a barrier against an anonymous caller spending a provider budget.

## Privacy and retention

**Retention is zero.** The prompt exists as a local variable for the length of one request. It is never written to Supabase, never logged, and never placed in an error message. No migration, no table, no RLS policy, and nothing for an operator to leak later.

Before the prompt leaves the server, `redactPrompt` removes wallet addresses, 32-byte values, PEM private-key blocks, and seed phrases, and reports each removal so the UI can say plainly what it refused to pass on. The same patterns run over model prose on the way back, because the draft schema has no address field but prose is free text.

Redaction is deliberately blunt. A false positive costs the user a word; a false negative costs them a secret.

Two consequences worth stating rather than hiding:

- The rate limiter is in-process, so a horizontally scaled deployment enforces the cap per instance rather than per wallet. A shared limiter would mean persisting per-wallet request history, which is exactly what zero retention rules out.
- Whatever a configured provider does with the request is that provider's policy, not ours. Nothing sensitive is sent, and the offline drafter exists so the feature never requires sending anything at all.

## Failure behaviour

The provider is optional by construction: HAS-16 requires that the baseline demo work without one. `heuristicDraft` reads the request with rules — amount, duration and unit, cliff, milestone count, and keywords in all three product locales — picks the closest catalog preset, and adjusts its numbers. Its copy comes from the already localized catalog, so an offline draft speaks English, 简体中文, and Español without holding a single string of product prose.

| Condition                                                           | Behaviour                                                             |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| No `AI_API_KEY`                                                     | Offline draft, marked `offlineDraft`                                  |
| 401 / 403                                                           | Offline draft                                                         |
| 400 upstream — a bad key on xAI, an exhausted output budget on Groq | Offline draft, classified `unavailable`                               |
| 429 upstream                                                        | Offline draft                                                         |
| 5xx or network failure                                              | Offline draft                                                         |
| Timeout (15 s)                                                      | Offline draft                                                         |
| Unparseable or incoherent output                                    | Offline draft                                                         |
| Output that fails `assertValidPreset`                               | Offline draft                                                         |
| Prompt outside 8–400 characters                                     | `400`, actionable and localized                                       |
| Per-wallet budget spent                                             | `429` with `Retry-After` and the real wait                            |
| No session                                                          | `401`                                                                 |
| Anything unclassified                                               | Throws. A bug that returns a plausible draft is a bug nobody reports. |

## What the user is told

The server sends machine codes, never sentences, so nothing user-facing is generated outside the dictionary. The UI resolves `ai.adjustment.*` and `ai.confirm.*` in the active locale.

- **Changed for you** — every correction normalization made: an allocation clamped, a cliff shortened, a milestone split rescaled, a field dropped, prose redacted.
- **Not supported** — what the draft itself could not honour, plus what the request asked for that a template cannot do: a wallet address it ignored, a secret it removed, an instruction to sign or send.
- **You still choose** — the beneficiary, the token, and the reviewer when the strategy has one. A TIME vault writes a zero reviewer address, so asking for one there would be a lie.
- **Assumptions** — the draft's own reasoning, in the reader's language.
- A permanent disclaimer that a draft only suggests, that the user confirms every value, and that the protocol's own checks still run before anything is signed. It is unconditional: the guarantee does not depend on what the user happened to type.

## Boundary summary

|              | AI draft data                 | Protocol submission                          |
| ------------ | ----------------------------- | -------------------------------------------- |
| Lives in     | Browser state and one request | HSK chain 133                                |
| Authority    | None. A suggestion.           | Absolute, per `docs/architecture.md`         |
| Identities   | Cannot express one            | Issuer, beneficiary, reviewer, token         |
| Persistence  | None                          | Immutable vault terms                        |
| Validated by | `assertValidPreset`           | `prepare()`, then `GrantVault`'s constructor |
| Triggered by | A description                 | The user's own wallet signature              |

The only trace a grant keeps of a draft is `organization_grants.template_key = "ai-draft"` — Supabase product context, presentation metadata with no onchain authority, exactly like every other template key.

## Tests

All under `apps/web/lib/**/*.test.ts`, running in Node with no network:

- `redact.test.ts`, `request-scan.test.ts` — what is removed and what is reported.
- `parse-draft.test.ts` — malformed JSON, wrong types, oversized prose, a payload that tries to name a beneficiary.
- `normalize.test.ts` — every clamp, and the invariant that any normalized draft passes `assertValidPreset`.
- `heuristic-draft.test.ts` — the issue's own prompt, determinism, and the same invariant for any input.
- `provider.test.ts` — 401, 403, 429, 5xx, network, abort, malformed, and that no failure carries the key or the upstream body.
- `rate-limit.test.ts` — both windows, refill, per-wallet isolation.
- `draft-service.test.ts` — fallback for every provider problem, prompt injection, secret non-exposure, and the identities a human must still pick.

Browser behaviour is in `apps/web/tests/ai-grant-builder.spec.ts` with the endpoint stubbed: it installs a recording wallet provider and asserts no transaction or signature is requested. Playwright is not part of `pnpm ci:check`; run `pnpm --filter @hashvest/web visual`.

## Related

- [`docs/architecture.md`](architecture.md) — the Protocol/Cloud boundary and the authority table this sits under.
- [`.agents/skills/ai-assistance/SKILL.md`](../.agents/skills/ai-assistance/SKILL.md) — the working procedure.
- [`apps/web/lib/shared/grant-presets/README.md`](../apps/web/lib/shared/grant-presets/README.md) — the preset authoring contract a draft has to satisfy.
