---
name: localization
description: Add or update HashVest localized strings for selected languages using the typed English source dictionary, safe fallbacks, preserved technical literals, and focused validation.
compatibility: Codex, Claude Code, and Agy with the selected locale requirements
---

# Localization

Use this skill for translation work, locale selection, message extraction, language coverage, or UI changes that introduce user-facing text. The current product contract is English (`en`), Simplified Chinese (`zh-CN`), and Spanish (`es`).

## Procedure

1. Read the relevant Linear issue and [`docs/architecture.md`](../../../docs/architecture.md). Inspect `apps/web/lib/shared/i18n/`, the English dictionary, locale registry, provider/server helpers, call sites, and tests.
2. Treat `apps/web/lib/shared/i18n/dictionaries/en.ts` as the source of truth. Add stable dot-namespaced keys there first, then update only the selected locale dictionaries with typed keys and complete, natural translations.
3. Keep locale selection and fallback behavior consistent with the existing cookie/provider/server boundary. If adding a language rather than filling an existing one, update the locale type, registry, dictionary exports, fallback tests, and documentation together.
4. Replace user-facing literals at the relevant surface, including landing, workspace, switcher, members, queues, wizard, templates, grant detail, actions, status, funding, and business-model messages when the issue includes them. Keep authenticated shell labels limited to live Overview, Grants, and Settings surfaces; the public `/plans` link and product-model copy are a separate presentation path. Organization copy belongs to the Settings organization routes. For sponsored claims, cover owner policy controls, beneficiary confirmation, relayer/gas-payer status, request/receipt states, failures, and the manual fallback in every selected locale. For milestone evidence, cover title, loading, error, retry, empty, unsafe-link, submitted status, submitter, created/updated timestamps, note, evidence types, and the review-queue title in every selected locale.
5. For grant templates, read catalog copy through `useGrantPresets`/`localizeGrantPreset`, including editable title, description, milestone, timing, and assumption suggestions. Keep `template_key`, strategy indexes, percentages, addresses, and other protocol values unchanged.
6. Route user-visible unknown errors through `errorMessage` with a localized fallback and localized RPC diagnostic; preserve validation and wallet-guard messages that were already translated by the caller.
7. Never translate or interpolate-chain technical literals such as addresses, hashes, contract identifiers, token symbols, chain IDs, explorer URLs, or wallet-provider UI. Use placeholders for values that must remain identical across locales.
8. Validate focused dictionary/logic tests, formatting, lint, typecheck, and build. Perform a visual desktop/mobile pass in every selected locale, including `/plans` for business-model work; do not invent new product behavior while translating.

## Completion criteria

Every new user-facing string is keyed, the English source and selected locales typecheck, missing translations use the intentional fallback, technical values remain exact, and the selected locale matrix is recorded in the PR.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, locale code, dictionary shape, fallback rule, translated surface, or user-facing localization behavior changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
