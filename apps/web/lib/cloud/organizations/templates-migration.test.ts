import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * CI has no PostgreSQL, so this pins the parts of the templates migration that
 * must never drift: its security posture and exactly which columns it stores.
 * Constraint behavior is exercised against a real database by
 * supabase/verification/organization_templates.sql (see
 * docs/organization-templates.md).
 */
const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../supabase/migrations/20260913000000_hashvest_organization_templates.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const sql = migration
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

function tableColumns(): string[] {
  const start = sql.indexOf(
    "create table if not exists public.organization_templates (",
  );
  const body = sql.slice(start, sql.indexOf("\n);", start));
  return body
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) =>
      /^[a-z_]+ (uuid|integer|text|smallint|jsonb|timestamptz)\b/.test(line),
    )
    .map((line) => line.split(" ")[0]);
}

describe("organization_templates migration", () => {
  it("stores exactly the designed columns and nothing a vault owns", () => {
    // Adding a column here is a design change: update
    // docs/organization-templates.md first. Never add beneficiary, token,
    // vault, funded allocation, or any amount a GrantVault computes.
    expect(tableColumns()).toEqual([
      "id",
      "organization_id",
      "version",
      "name",
      "description",
      "strategy",
      "schedule_unit_seconds",
      "cliff_units",
      "duration_units",
      "milestones",
      "allocation_suggestion",
      "default_reviewer_member_id",
      "created_by_wallet",
      "updated_by_wallet",
      "created_at",
      "updated_at",
      "archived_at",
    ]);
  });

  it("never stores protocol state or a participant address", () => {
    const columns = tableColumns();
    for (const forbidden of [
      /beneficiar/,
      /token/,
      /vault/,
      /claim/,
      /unlock/,
      /vested/,
      /balance/,
      /revok/,
      /reviewer_(wallet|address)/,
    ]) {
      expect(columns.filter((column) => forbidden.test(column))).toEqual([]);
    }
  });

  it("keeps the browser out: RLS on, no grants, no policies", () => {
    expect(sql).toContain(
      "alter table public.organization_templates enable row level security;",
    );
    expect(sql).toContain(
      "revoke all on table public.organization_templates from public, anon, authenticated;",
    );
    // Statements only: comment strings legitimately contain the word "grant".
    expect(sql).not.toMatch(/^\s*grant\s/im);
    expect(sql).not.toMatch(/^\s*create\s+policy\b/im);
  });

  it("scopes the reviewer default to a member of the same organization", () => {
    expect(sql).toMatch(
      /foreign key \(organization_id, default_reviewer_member_id\)\s+references public\.organization_members \(organization_id, id\)\s+on delete set null \(default_reviewer_member_id\)/,
    );
  });

  it("encodes every strategy rule as a named constraint", () => {
    for (const name of [
      "organization_templates_strategy_valid",
      "organization_templates_schedule_shape",
      "organization_templates_schedule_strategy",
      "organization_templates_schedule_unit_valid",
      "organization_templates_duration_valid",
      "organization_templates_cliff_valid",
      "organization_templates_milestones_strategy",
      "organization_templates_milestones_shape",
      "organization_templates_allocation_suggestion_valid",
      "organization_templates_time_has_no_reviewer",
      "organization_templates_default_reviewer_fk",
    ]) {
      expect(sql).toContain(`constraint ${name}`);
    }
  });

  it("changes no existing column", () => {
    expect(sql).not.toMatch(/alter table public\.organization_grants/);
    expect(sql).not.toMatch(/alter column|drop column|drop table/i);
  });
});
