---
name: ui-ux
description: Make small, accessible, responsive UI improvements on the current HashVest surface while preserving wallet, session, transaction, and localization behavior before the planned redesign.
compatibility: Codex, Claude Code, and Agy with browser inspection when available
---

# Current UI and UX

Use this skill for focused UI fixes or incremental product-flow improvements. A total visual redesign is intentionally out of scope until its dedicated PR and design direction arrive.

## Procedure

1. Read the relevant Linear issue, existing component, page, shared UI conventions, and current locale keys before editing.
2. Preserve the current information architecture, wallet/session boundaries, transaction states, loading/error/empty states, and technical literals.
3. Prefer semantic HTML, keyboard access, visible focus, useful labels, readable contrast, and responsive behavior. Keep styling changes local and avoid introducing a new design system or broad visual refactor.
4. Reuse existing components and translation keys. If text changes, use the [`localization`](../localization/SKILL.md) skill as well.
5. Validate focused logic/component tests and perform a manual desktop/mobile pass when the surface is visual. Do not add a Cypress UI suite unless a Linear issue explicitly requires it.

## Completion criteria

The requested current-surface behavior works without changing product scope, technical values, authorization, or transaction semantics. Accessibility and responsive checks are recorded, and the diff is small enough to be safely replaced by the future redesign.

## Obligatory maintenance

**NECESSARY AND OBLIGATORY:** if any referenced path, command, component convention, user flow, localization rule, or design constraint changes, update this skill, `README.md`, `AGENTS.md`, and the relevant documentation in the same change. Run `pnpm agents:sync` and `pnpm agents:check`; stale references make the task incomplete.
