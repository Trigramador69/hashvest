# Organization-owned grant templates

Design for [HAS-12](https://linear.app/hashvest/issue/HAS-12): the smallest Supabase-backed model that lets an organization save its own repeatable grant configurations. [HAS-13](https://linear.app/hashvest/issue/HAS-13) built the owner CRUD flows and the wizard application on top of it; both have shipped, and the sections marked HAS-13 below describe what runs.

## What a template is

A template is **draft configuration metadata**. Applying one fills the shared grant wizard with suggestions the user can edit before any wallet request, exactly as the global presets from HAS-8 do. It is never a transaction, never a permission, and never a copy of anything a GrantVault holds.

The rule from [`architecture.md`](architecture.md) holds unchanged: **HSK is authoritative for value and permission; Supabase is product context.** A template belongs entirely to the second column.

## Scope

| In HAS-12 (the data and rules layer)                         | In HAS-13 (routes, UI, wizard)                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| `organization_templates` table, constraints, and RLS posture | Route Handlers for create, edit, list, and delete               |
| Domain and database types                                    | Browser API client and TanStack Query hooks                     |
| Input validation, including strategy/milestone combinations  | Owner template management UI and mobile form states             |
| Versioning and the `template_key` linkage format             | Applying a template in the direct and organization-aware wizard |
| Data-access functions that enforce owner-only mutation       | Showing template provenance on grants                           |
| A pure, idempotent mapping from a template to a wizard draft |                                                                 |

## Stored fields, and why none of them is authority

| Field                          | Stored as                                                         | Why it is safe                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                           | `name` text, 1–80 chars                                           | Presentation. Also the default grant title, which the user can edit.                                                                                                |
| Description                    | `description` text, optional                                      | Presentation. Default grant description in organization-aware creation.                                                                                             |
| Strategy                       | `strategy` smallint: 0 TIME, 1 MILESTONE, 2 HYBRID                | Mirrors `UnlockStrategy` in `GrantTypes.sol`. A suggestion: the vault stores whatever strategy is submitted.                                                        |
| Schedule unit, cliff, duration | `schedule_unit_seconds`, `cliff_units`, `duration_units` integers | In the wizard's own vocabulary (60, 3600, or 86400 seconds per unit). Converted to strings on application.                                                          |
| Milestone structure            | `milestones` jsonb: `[{ title, percentOfAllocation }]`            | **Percentages, not amounts.** The split is recomputed against whatever allocation the user enters, so no amount is ever stored.                                     |
| Allocation suggestion          | `allocation_suggestion` text, optional                            | A default the user can overwrite, like HAS-8's `allocationSuggestion`. Never read from, written to, or reconciled with a vault.                                     |
| Default reviewer               | `default_reviewer_member_id` uuid, optional                       | **A reference to an organization member, never a wallet address.** It is resolved to the member's current wallet only when applied, and the user still confirms it. |

Deliberately **not** stored: beneficiary, token address, vesting start, any vault address, and every value a vault computes — allocation actually funded, vested, unlocked, claimable, claimed, balance, approval state, revocation state.

### Two tensions in the issue, resolved

**"Milestone structure and allocation" versus "no authoritative allocation copied into storage."** The template stores the _shape_ of the allocation — how it divides across milestones, as percentages that sum to 100 — plus an optional default amount. Neither is state: nothing is copied from a vault, and the wizard recomputes every milestone amount from the allocation the user actually submits.

**"Optional reviewer default" versus "never treat a stored reviewer as permission truth."** The default is a foreign key to `organization_members`, not an address. Removing the member clears it. Applying a template only preselects that member in the wizard's picker; the reviewer that can approve milestones is the address submitted onchain, and `resolveProtocolRoles` keeps reading it from the vault.

## Schema

`supabase/migrations/20260913010000_hashvest_organization_templates.sql` adds one table and one supporting constraint. It changes no existing column. Its version follows the already-applied sponsorship migration, which uses `20260913000000`.

```text
organization_templates
  id                          uuid        pk
  organization_id             uuid        → organizations.id, on delete cascade
  version                     integer     ≥ 1, incremented on every update
  name                        text        trimmed, 1–80
  description                 text        null | trimmed, 1–1000
  strategy                    smallint    0 | 1 | 2
  schedule_unit_seconds       integer     null | 60 | 3600 | 86400
  cliff_units                 integer     null | 0 … duration_units
  duration_units              integer     null | > 0
  milestones                  jsonb       null | array of 1–20
  allocation_suggestion       text        null | positive decimal
  default_reviewer_member_id  uuid        null | same-organization member
  created_by_wallet           text        lowercase address
  updated_by_wallet           text        lowercase address
  created_at, updated_at      timestamptz
  archived_at                 timestamptz null while active
```

Constraints that encode the strategy rules at the database level:

| Rule                                                      | Constraint                                                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| MILESTONE has no schedule; TIME and HYBRID require one    | the three schedule columns are all null **if and only if** `strategy = 1`                                            |
| TIME has no milestones; MILESTONE and HYBRID require them | `milestones` is null **if and only if** `strategy = 0`                                                               |
| TIME never carries a reviewer                             | `strategy = 0` implies `default_reviewer_member_id is null`                                                          |
| A reviewer default belongs to the same organization       | composite foreign key `(organization_id, default_reviewer_member_id)` → `organization_members (organization_id, id)` |
| Removing that member clears only the default              | `on delete set null (default_reviewer_member_id)`                                                                    |
| Active names are unique per organization                  | partial unique index on `(organization_id, lower(name)) where archived_at is null`                                   |

The composite foreign key needs `organization_members (organization_id, id)` to be unique. `id` is already the primary key, so the new unique constraint is always satisfied and rewrites nothing.

`on delete set null` with a column list requires **PostgreSQL 15 or later**. Supabase projects run 15 or newer; without the column list, deleting a member would try to null `organization_id` as well and fail its `not null` constraint.

### Validation layers

Each layer catches what the one before it cannot:

1. **Database** — structure: types, nullability per strategy, schedule ranges, array length, reviewer organization.
2. **Server input parsing** (`parseOrganizationTemplateInput`) — semantics that are awkward in SQL: every milestone has a title of at most 120 characters, percentages are positive whole numbers that sum to exactly 100. It reuses the same rules the global presets use.
3. **Application** — `applyOrganizationTemplateToDraft` re-runs those rules before producing a draft. A template that somehow reached storage in an invalid state cannot fill the wizard with a configuration the protocol would reject.

The wizard's own validation remains the final authority on what is submitted.

## Versioning

**Chosen: a mutable row with a version counter and optimistic concurrency.**

- A template starts at `version = 1`.
- An update names the version it was based on. It succeeds only if that is still the current version, and increments it. Otherwise the write is refused with a conflict, so two open editors cannot silently overwrite each other.
- A grant created from a template records `org-template:<template id>@v<version>` in the existing `organization_grants.template_key` column.

Old versions' content is **not retained**. That is enough for the stated need — a grant can say which template and which version it came from — because the GrantVault itself holds the terms that were actually submitted. A template's history would only ever be a record of suggestions.

**Considered and rejected for the MVP: an immutable `organization_template_versions` table**, one row per revision. It gives full history, but it doubles the schema, complicates every read with a join to the latest version, and answers a question no current requirement asks. The chosen key format already carries the version, so this table can be added later without changing a single stored `template_key`.

## Deletion

Deleting a template **archives** it: `archived_at` is set and the template disappears from lists and pickers.

A hard delete would break provenance. Grants that were created from the template keep its key, and resolving that key to a name for display needs the row to exist. Archiving also guarantees HAS-13's criterion that deleting a template never alters an existing grant: there is no foreign key from `organization_grants` to templates at all, so a grant cannot even notice.

An archived name becomes available again, which is why name uniqueness is enforced only among active templates.

## The `template_key` linkage

`organization_grants.template_key` already exists and today holds a global preset key such as `ecosystem-grant`. Organization templates share the column under a distinct namespace:

| Kind                  | Format                           | Example                     |
| --------------------- | -------------------------------- | --------------------------- |
| Global preset         | lowercase kebab-case             | `builder-grant`             |
| Organization template | `org-template:<uuid>@v<version>` | `org-template:9d1e…c2a4@v3` |

The two can never collide: global keys are restricted to lowercase letters, digits, and hyphens, and every organization key contains a colon. The longest possible organization key is 61 characters, inside the column's existing 80-character limit, so **no migration of `template_key` is needed**.

`parseTemplateKey` classifies any stored key as `global`, `organization`, or `unknown`, and never throws, so legacy or hand-edited values degrade to raw text instead of breaking a grant card.

## Authorization

Unchanged model: every read and write goes through a server function, the browser never touches the table, and RLS grants `anon` and `authenticated` nothing.

| Operation                        | Who                            |
| -------------------------------- | ------------------------------ |
| List active templates, apply one | any member of the organization |
| Create, update, archive          | the organization owner only    |

Owner-only mutation is enforced **inside the data-access functions**, not only at the route, so a future caller cannot skip it. Every query is filtered by `organization_id`, and the reviewer default is constrained to the same organization by the database. A template id from another organization is indistinguishable from one that does not exist.

## Applying a template to a draft

`applyOrganizationTemplateToDraft` is pure: no network, no address, no signature. It returns the same `AppliedPresetDraft` the global presets produce, plus the `defaultReviewerMemberId` for the wizard to preselect.

- It reuses the global preset mapping, so templates and presets cannot drift in how they fill the wizard.
- A title or allocation the user already typed wins over the template's suggestion.
- Applying the same template to its own result returns an identical draft. That idempotency is what lets HAS-13 re-apply on re-render without clobbering anything.

## HTTP surface (HAS-13)

Route Handlers stay thin, as for members and grants: they validate identifiers, parse the body, and call the owner- or member-guarded server functions above. Nothing new decides authorization.

| Method   | Path                                                 | Allowed    | Body                            | Success             |
| -------- | ---------------------------------------------------- | ---------- | ------------------------------- | ------------------- |
| `GET`    | `/api/organizations/{organizationId}/templates`      | any member | —                               | `200 { templates }` |
| `POST`   | `/api/organizations/{organizationId}/templates`      | owner      | template content                | `201 { template }`  |
| `GET`    | `/api/organizations/{organizationId}/templates/{id}` | any member | —                               | `200 { template }`  |
| `PATCH`  | `/api/organizations/{organizationId}/templates/{id}` | owner      | `{ template, expectedVersion }` | `200 { template }`  |
| `DELETE` | `/api/organizations/{organizationId}/templates/{id}` | owner      | —                               | `200 { ok: true }`  |

- **No session** returns `401`, **not a member** `403`, and a **member attempting a mutation** `403` — all before any write.
- `GET …/templates?include=archived` also returns archived templates. It exists only so grant provenance can still name a template that was deleted after the grant was created.
- Mutations require a same-origin request, like every other workspace write.
- Reads are `Cache-Control: no-store`.

## Applying a template in the wizard (HAS-13)

The Template step is the only entry point, and applying a template goes through the same `selectPreset` field-ownership rules as a global preset or an AI draft. Nothing in this path signs, submits, or funds: the user still walks every step, and `prepare()` still validates what is submitted.

| Path                                                      | Which templates                                                                                     | Reviewer default                                                                   | Provenance recorded                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Organization-aware (`/app/organizations/{id}/grants/new`) | that organization's active templates                                                                | preselects the member in the reviewer picker                                       | yes: `org-template:<id>@v<version>` on the grant association |
| Direct (`/grants/new`)                                    | active templates of an organization the signed-in workspace wallet belongs to, chosen from a picker | fills the reviewer address with that member's **current** wallet, as editable text | no: direct creation never writes workspace metadata          |

Rules that hold on both paths:

- **Beneficiary is never set by a template.** It was never stored.
- **A reviewer default never overwrites a choice the user already made** — a picked member or a typed address stays. It is ignored for time vesting, and ignored when the member is no longer in the organization.
- **Clearing or switching a template leaves the reviewer alone.** Field ownership covers the fields a template writes; the reviewer is only ever pre-filled, so it is the user's from the moment it appears.
- **The external-wallet fallback is unchanged.** Choosing an external reviewer or beneficiary works exactly as before a template was applied.
- Only a workspace session whose wallet matches the connected wallet can see organization templates, the same guard every workspace read uses.

### Where it lives

| Concern                        | Module                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route Handlers                 | `apps/web/app/api/organizations/[organizationId]/templates/{route.ts,[templateId]/route.ts}`                                                              |
| Browser client and query hooks | `lib/cloud/organizations/client.ts`, `hooks/use-organizations.ts` (`useOrganizationTemplates`, `useTemplateLabel`, create/update/archive mutations)       |
| Template as a preset           | `lib/shared/grant-presets/organization-template.ts` (`organizationTemplatePreset`)                                                                        |
| Reviewer default               | `lib/shared/grant-presets/wizard-state.ts` (`applyReviewerDefault`)                                                                                       |
| Provenance name                | `lib/shared/grant-presets/provenance.ts` (`resolveTemplateLabel`)                                                                                         |
| Editor form rules              | `lib/shared/grant-presets/template-form.ts`                                                                                                               |
| UI                             | `components/organization-template-picker.tsx` (wizard), `components/templates-manager.tsx` and `components/template-editor.tsx` (workspace Templates tab) |

### Provenance on grants

Grant cards and the grant detail page resolve an `org-template:` key against the grant's organization, **including archived templates**, and show the template's name as metadata. A key that resolves to nothing — a template the viewer cannot read — shows no template rather than an error. The terms on screen always come from the vault, never from the template.

## Failure behavior

| Situation                                            | Result                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| Member tries to create, update, or archive           | `403`, no write                                                                 |
| Update based on a stale version                      | `409`, no write; the editor reloads and retries                                 |
| Duplicate active name                                | `409`                                                                           |
| Reviewer default is not a member of the organization | `400`                                                                           |
| Template from another organization, or archived      | `404`                                                                           |
| Reviewer default member is later removed             | default cleared by the database; template stays valid                           |
| Supabase unavailable                                 | `503`, same as the rest of the workspace; direct onchain creation is unaffected |

## Migration and rollback

The migration is additive: a new table, a new unique constraint that existing data already satisfies, closed RLS. No existing column, row, or constraint changes.

**The migration must be applied before HAS-13 is deployed.** Until it is, every template route answers `503` like any other unavailable workspace read, the wizard's template section reports that templates are unavailable, and the built-in presets and direct onchain creation are unaffected.

To roll back before HAS-13 is deployed:

```sql
drop table if exists public.organization_templates;
alter table public.organization_members
  drop constraint if exists organization_members_organization_id_id_key;
```

After HAS-13, dropping the table would leave grants with `org-template:` keys that no longer resolve to a name. `parseTemplateKey` still classifies them, so they degrade to an unnamed provenance label rather than an error.

## Test plan

| Area                   | Covered by                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Migration              | `supabase/verification/organization_templates.sql` asserts every constraint above, with exact SQLSTATEs, against a disposable database after both migrations (verified on PostgreSQL 18.3 via PGlite, including a second application of the migration). It is not part of CI, which has no database; `templates-migration.test.ts` runs in CI and pins the security posture and the exact column list. |
| Types and validation   | Valid templates for each strategy; every invalid strategy, schedule, milestone, and reviewer combination rejected.                                                                                                                                                                                                                                                                                     |
| Key linkage            | Round-trip format and parse; global and organization keys never collide; malformed keys classified, not thrown.                                                                                                                                                                                                                                                                                        |
| Organization isolation | Data access never returns or mutates another organization's template.                                                                                                                                                                                                                                                                                                                                  |
| Owner authorization    | Owner mutations succeed; member mutations are refused before any write.                                                                                                                                                                                                                                                                                                                                |
| Application            | Idempotent; user-typed values survive; invalid stored templates refused; no amount or address in the output that the user did not enter.                                                                                                                                                                                                                                                               |

### HAS-13

| Area                 | Covered by                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route authorization  | Vitest runs the real Route Handlers with a mocked session and database: unauthenticated, non-member, member, and owner against every method, in CI.                                                                                                                                                                                                                                            |
| Validation over HTTP | The same route tests: malformed bodies, invalid combinations, stale versions, cross-organization ids.                                                                                                                                                                                                                                                                                          |
| Wizard application   | Pure tests of template-to-preset mapping through `selectPreset`, reviewer-default resolution on both paths, and provenance lookup, in CI.                                                                                                                                                                                                                                                      |
| Form states          | Pure tests of the template form model (`template-form.test.ts`) in CI. `tests/organization-templates.spec.ts` renders the form's empty, invalid, milestone-total and saving states at 390px against the guarded `/visual/templates` fixture, asserting that an invalid form sends no request and that no wallet is asked to sign. Like the AI builder spec, it is not part of `pnpm ci:check`. |
