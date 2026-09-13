---
name: ui-ux
description: Implement the HashVest design specification as accessible, responsive UI while preserving wallet, session, transaction, analytics authority, and localization behavior.
compatibility: Codex, Claude Code, and Agy with browser inspection when available
---

# HashVest design-system implementation

Use this skill for the dedicated design refactor and for follow-up UI slices. [`design.md`](../../../design.md) is the visual source of truth: near-black surfaces, warm mono typography, green primary state, cobalt blue secondary state, orange warnings, one-pixel borders, restrained radii, point/data-art, and dense responsive layouts. Do not copy a generic SaaS dashboard or introduce purple, glassmorphism, gradients, or decorative product data.

## Procedure

1. Read [`design.md`](../../../design.md), the existing component/page, shared UI conventions, and current locale keys before editing. A Linear issue is optional when the requester explicitly asks for an issue-free design branch.
2. Preserve the product information architecture: `/app` is the live overview, `/app/grants` is the direct Issued/Received/Review surface, and `/app/settings` owns organization context. The public landing summary and `/plans` are a separate presentation path for Protocol versus Cloud and the Free / Team / Enterprise value ladder; they must not become billing or entitlement controls. Preserve HSK wallet/session boundaries, transaction states, loading/error/empty/partial states, live event-derived analytics, and technical literals. Legacy paths may redirect but must not render duplicate UI. A sponsored claim must show explicit beneficiary confirmation, the gas payer, request/receipt status, and the always-available manual fallback. Milestone evidence is private workspace context: show it only to authenticated organization members on GrantDetail and the review queue, keep explicit loading/error/retry/empty states, never render an unsafe URL as a link, and leave approval on the existing onchain `approveMilestone` action.
3. Prefer semantic HTML, keyboard access, visible focus, useful labels, readable contrast, reduced-motion behavior, and responsive behavior. Build reusable primitives (`Panel`, `MetricCard`, `DataArt`) instead of duplicating visual rules.
4. Reuse existing components and translation keys. Every new user-visible string must be added to the typed English source dictionary and translated for ES and zh-CN; keep authenticated navigation limited to working product surfaces and remove dead controls. Public product-model copy must label each capability as demo or roadmap and never imply prices or enforced plan limits. Use the [`localization`](../localization/SKILL.md) skill as well.
5. Validate focused logic/component tests, `pnpm --filter @hashvest/web typecheck`, `pnpm --filter @hashvest/web lint`, and the Playwright visual contract (`pnpm --filter @hashvest/web visual`). For product-model work, review `/plans` on desktop and mobile in English, Spanish, and Simplified Chinese. Use deterministic fixtures only in guarded visual-test routes; never fabricate production analytics or token values.

## Completion criteria

The requested surface follows `design.md` without changing product scope, technical values, authorization, or transaction semantics. Accessibility and responsive checks are recorded, visual snapshots are deterministic, and HSK remains authoritative for every value and permission.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, component convention, user flow, localization rule, or design constraint changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
