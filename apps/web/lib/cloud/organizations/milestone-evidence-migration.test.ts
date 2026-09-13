import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../supabase/migrations/20260913020000_hashvest_milestone_evidence.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const sql = migration
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("milestone evidence migration", () => {
  it("stores only scoped product evidence metadata", () => {
    expect(sql).toContain(
      "create table if not exists public.organization_grant_milestone_evidence (",
    );
    for (const column of [
      "chain_id",
      "vault_address",
      "milestone_index",
      "evidence_url",
      "evidence_type",
      "note",
      "submitted_by_wallet",
      "created_at",
      "updated_at",
    ]) {
      expect(sql).toContain(`  ${column} `);
    }
    for (const forbidden of [
      /total_allocation/i,
      /claimed_amount/i,
      /unlocked_amount/i,
      /beneficiary/i,
      /reviewer/i,
      /approval/i,
    ]) {
      expect(sql).not.toMatch(forbidden);
    }
  });

  it("makes one current evidence record unique per grant milestone", () => {
    expect(sql).toMatch(
      /primary key \(chain_id, vault_address, milestone_index\)/i,
    );
    expect(sql).toMatch(
      /foreign key \(chain_id, vault_address\)\s+references public\.organization_grants \(chain_id, vault_address\)\s+on delete cascade/i,
    );
  });

  it("accepts only chain 133, a lowercase vault, a non-negative index, and a safe URL", () => {
    expect(sql).toMatch(
      /organization_grant_milestone_evidence_chain_valid\s+check \(chain_id = 133\)/i,
    );
    expect(sql).toMatch(/vault_address = lower\(vault_address\)/);
    expect(sql).toMatch(/milestone_index >= 0/);
    expect(sql).toContain("evidence_url ~ '^https://[A-Za-z0-9]'");
    expect(sql).toContain("evidence_type = 'ipfs'");
    expect(sql).toContain("evidence_url ~ '^ipfs://[A-Za-z0-9]'");
    expect(sql).toContain("and evidence_url !~ '@'");
  });

  it("keeps evidence server-only with closed RLS", () => {
    expect(sql).toContain(
      "alter table public.organization_grant_milestone_evidence enable row level security;",
    );
    expect(sql).toMatch(
      /revoke all on table public\.organization_grant_milestone_evidence\s+from public, anon, authenticated;/i,
    );
    expect(sql).not.toMatch(/^\s*grant\s/im);
    expect(sql).not.toMatch(/^\s*create\s+policy\b/im);
  });
});
