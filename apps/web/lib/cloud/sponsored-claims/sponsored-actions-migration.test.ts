import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../supabase/migrations/20260913040000_hashvest_sponsored_actions.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const sql = migration
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("sponsored actions migration", () => {
  it("adds policy and request tables without mutating the first-claim prototype", () => {
    expect(sql).toContain(
      "create table if not exists public.organization_sponsorship_policies (",
    );
    expect(sql).toContain(
      "create table if not exists public.sponsored_action_requests (",
    );
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).not.toMatch(/sponsored_claim_policies/);
    expect(sql).not.toMatch(/sponsored_claim_requests/);
    for (const column of [
      "allowed_actions",
      "allowed_vaults",
      "max_actions",
      "used_actions",
      "max_actions_per_wallet_per_day",
      "max_gas_budget_wei",
      "reserved_gas_wei",
      "spent_gas_wei",
    ]) {
      expect(sql).toContain(`  ${column} `);
    }
  });

  it("keeps replay identity unique only for live requests", () => {
    expect(sql).toMatch(
      /sponsored_actions_vault_type_nonce_idx[\s\S]*where status <> 'abandoned'/,
    );
    expect(sql).toContain("and status <> 'abandoned'");
  });

  it("reclaims stale processing leases and expires unused reservations", () => {
    expect(sql).toContain("status = 'processing'");
    expect(sql).toContain("interval '2 minutes'");
    expect(sql).toContain(
      "used_actions = greatest(0, used_actions - expired_count)",
    );
    expect(sql).toContain(
      "reserved_gas_wei = greatest(0, reserved_gas_wei - request.estimated_gas_cost_wei)",
    );
  });

  it("enforces policy, budget, and action allowlists in the reservation function", () => {
    expect(sql).toContain("SPONSORSHIP_DISABLED");
    expect(sql).toContain("ACTION_NOT_ALLOWED");
    expect(sql).toContain("VAULT_NOT_ALLOWED");
    expect(sql).toContain("ACTION_LIMIT_REACHED");
    expect(sql).toContain("DAILY_RATE_LIMIT_REACHED");
    expect(sql).toContain("GAS_BUDGET_REACHED");
    expect(sql).toContain("ACTION_BINDING_MISMATCH");
    expect(sql).toContain(
      "allowed_actions <@ array['claim', 'review']::text[]",
    );
  });

  it("keeps sponsorship tables server-only with closed RLS", () => {
    expect(sql).toContain(
      "alter table public.organization_sponsorship_policies enable row level security;",
    );
    expect(sql).toContain(
      "alter table public.sponsored_action_requests enable row level security;",
    );
    expect(sql).toMatch(
      /revoke all on table public\.organization_sponsorship_policies from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /revoke all on table public\.sponsored_action_requests from public, anon, authenticated;/,
    );
    expect(sql).not.toMatch(/^\s*create\s+policy\b/im);
    expect(sql).toContain(
      "grant execute on function public.reserve_sponsored_action(",
    );
    expect(sql).toContain("to service_role;");
  });
});
