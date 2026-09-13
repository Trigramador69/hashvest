import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../shared/api-error";
import type { Database, OrganizationMilestoneEvidenceRow } from "./types";

vi.mock("server-only", () => ({}));

const ORG_A = "0a0a0a0a-0000-4000-8000-00000000000a";
const ORG_B = "0b0b0b0b-0000-4000-8000-00000000000b";
const VAULT_A = "0x00000000000000000000000000000000000000aa";
const VAULT_B = "0x00000000000000000000000000000000000000bb";
const OWNER_WALLET = "0x00000000000000000000000000000000000000c1";
const MEMBER_WALLET = "0x00000000000000000000000000000000000000c2";

const verifyGrantMilestone = vi.fn();
const requireOrganizationMember = vi.fn();

vi.mock("@/lib/protocol/verify", () => ({ verifyGrantMilestone }));
vi.mock("./server", () => ({ requireOrganizationMember }));

type Row = Record<string, unknown>;

function fakeSupabase() {
  const grants: Row[] = [
    { organization_id: ORG_A, chain_id: 133, vault_address: VAULT_A },
    { organization_id: ORG_B, chain_id: 133, vault_address: VAULT_B },
  ];
  const evidence: Row[] = [];
  const state = {
    evidence,
    writes: [] as Row[],
    nextError: null as { code: string } | null,
  };

  function from(table: string) {
    let operation: "select" | "upsert" = "select";
    let payload: Row = {};
    const filters: { column: string; value: unknown }[] = [];
    let orderColumn: string | undefined;

    function rows() {
      if (table === "organization_grants") return grants;
      if (table === "organization_grant_milestone_evidence") return evidence;
      throw new Error(`Unexpected table ${table}`);
    }

    function execute() {
      if (state.nextError) {
        const error = state.nextError;
        state.nextError = null;
        return { data: null, error };
      }
      const matched = rows().filter((row) =>
        filters.every((filter) => row[filter.column] === filter.value),
      );
      if (operation === "upsert") {
        const existing = evidence.find(
          (row) =>
            row.chain_id === payload.chain_id &&
            row.vault_address === payload.vault_address &&
            row.milestone_index === payload.milestone_index,
        );
        if (existing) Object.assign(existing, payload);
        else
          evidence.push({
            created_at: "2026-09-13T00:00:00.000Z",
            ...payload,
          });
        state.writes.push({ ...payload });
        return {
          data: [existing ?? evidence[evidence.length - 1]],
          error: null,
        };
      }
      const data = [...matched];
      const column = orderColumn;
      if (column)
        data.sort(
          (left, right) =>
            Number(left[column] ?? 0) - Number(right[column] ?? 0),
        );
      return { data, error: null };
    }

    const builder = {
      select: () => builder,
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return builder;
      },
      order(column: string) {
        orderColumn = column;
        return builder;
      },
      upsert(value: Row) {
        operation = "upsert";
        payload = value;
        return builder;
      },
      maybeSingle: async () => {
        const result = execute();
        return result.error
          ? result
          : { data: result.data?.[0] ?? null, error: null };
      },
      single: async () => {
        const result = execute();
        return result.error
          ? result
          : { data: result.data?.[0] ?? null, error: null };
      },
      then<Result>(
        resolve: (value: ReturnType<typeof execute>) => Result,
        reject?: (reason: unknown) => Result,
      ) {
        return Promise.resolve(execute()).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    state,
  };
}

function evidenceRow(
  vaultAddress: string,
  milestoneIndex: number,
  overrides: Partial<OrganizationMilestoneEvidenceRow> = {},
): OrganizationMilestoneEvidenceRow {
  return {
    chain_id: 133,
    vault_address: vaultAddress,
    milestone_index: milestoneIndex,
    evidence_url: "https://github.com/hashvest/hashvest/pull/15",
    evidence_type: "github_pr",
    note: null,
    submitted_by_wallet: MEMBER_WALLET,
    created_at: "2026-09-13T00:00:00.000Z",
    updated_at: "2026-09-13T00:00:00.000Z",
    ...overrides,
  };
}

function access(
  supabase: SupabaseClient<Database>,
  organizationId = ORG_A,
  walletAddress = MEMBER_WALLET,
) {
  return {
    supabase,
    session: { walletAddress, chainId: 133 as const, expiresAt: "future" },
    organization: {
      id: organizationId,
      name: "Workspace",
      createdByWallet: OWNER_WALLET,
      createdAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
    },
    membership: {
      id: "m1",
      walletAddress,
      displayName: "Member",
      roleLabel: null,
      isOwner: false,
    },
  };
}

describe("milestone evidence data access", () => {
  beforeEach(() => {
    vi.resetModules();
    verifyGrantMilestone.mockReset();
    verifyGrantMilestone.mockResolvedValue({ milestoneCount: 2 });
    requireOrganizationMember.mockReset();
  });

  it("lists evidence only for a grant associated with the member's organization", async () => {
    const fake = fakeSupabase();
    fake.state.evidence.push(evidenceRow(VAULT_A, 0));
    fake.state.evidence.push(evidenceRow(VAULT_B, 0));
    requireOrganizationMember.mockResolvedValue(access(fake.client));
    const { listGrantMilestoneEvidence } = await import("./evidence-server");

    await expect(
      listGrantMilestoneEvidence(ORG_A, VAULT_A),
    ).resolves.toMatchObject([{ vaultAddress: VAULT_A, milestoneIndex: 0 }]);
  });

  it("rejects a cross-organization grant before reading or writing evidence", async () => {
    const fake = fakeSupabase();
    requireOrganizationMember.mockResolvedValue(access(fake.client, ORG_A));
    const { upsertGrantMilestoneEvidence } = await import("./evidence-server");

    await expect(
      upsertGrantMilestoneEvidence(ORG_A, VAULT_B, 0, {
        evidenceUrl: "https://example.com/evidence",
        evidenceType: "document",
        note: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fake.state.writes).toEqual([]);
    expect(verifyGrantMilestone).not.toHaveBeenCalled();
  });

  it("takes the submitter wallet from the verified session", async () => {
    const fake = fakeSupabase();
    requireOrganizationMember.mockResolvedValue(
      access(fake.client, ORG_A, MEMBER_WALLET),
    );
    const { upsertGrantMilestoneEvidence } = await import("./evidence-server");

    await upsertGrantMilestoneEvidence(ORG_A, VAULT_A, 1, {
      evidenceUrl: "https://example.com/evidence",
      evidenceType: "document",
      note: null,
    });

    expect(fake.state.writes[0]).toMatchObject({
      submitted_by_wallet: MEMBER_WALLET,
      vault_address: VAULT_A,
      milestone_index: 1,
    });
    expect(fake.state.writes[0]).not.toHaveProperty("submittedByWallet");
  });

  it("validates the milestone onchain before persisting", async () => {
    const fake = fakeSupabase();
    requireOrganizationMember.mockResolvedValue(access(fake.client));
    verifyGrantMilestone.mockRejectedValueOnce(
      new ApiError(422, "Milestone index is outside this GrantVault."),
    );
    const { upsertGrantMilestoneEvidence } = await import("./evidence-server");

    await expect(
      upsertGrantMilestoneEvidence(ORG_A, VAULT_A, 9, {
        evidenceUrl: "https://example.com/evidence",
        evidenceType: "document",
        note: null,
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(fake.state.writes).toEqual([]);
  });

  it("rejects a vault that is not a readable GrantVault", async () => {
    const fake = fakeSupabase();
    requireOrganizationMember.mockResolvedValue(access(fake.client));
    verifyGrantMilestone.mockRejectedValueOnce(
      new ApiError(
        422,
        "The address is not a readable HashVest GrantVault on HSK Testnet.",
      ),
    );
    const { upsertGrantMilestoneEvidence } = await import("./evidence-server");

    await expect(
      upsertGrantMilestoneEvidence(ORG_A, VAULT_A, 0, {
        evidenceUrl: "https://example.com/evidence",
        evidenceType: "document",
        note: null,
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(fake.state.writes).toEqual([]);
  });

  it("upserts the same milestone without creating a duplicate row", async () => {
    const fake = fakeSupabase();
    fake.state.evidence.push(evidenceRow(VAULT_A, 0));
    requireOrganizationMember.mockResolvedValue(access(fake.client));
    const { upsertGrantMilestoneEvidence } = await import("./evidence-server");
    const input = {
      evidenceUrl: "https://example.com/updated",
      evidenceType: "deployment" as const,
      note: "Updated proof",
    };

    await upsertGrantMilestoneEvidence(ORG_A, VAULT_A, 0, input);
    await upsertGrantMilestoneEvidence(ORG_A, VAULT_A, 0, input);

    expect(fake.state.evidence).toHaveLength(1);
    expect(fake.state.evidence[0]).toMatchObject({
      evidence_url: input.evidenceUrl,
      evidence_type: input.evidenceType,
      note: input.note,
    });
  });

  it("maps Supabase failures to an unavailable workspace error", async () => {
    const fake = fakeSupabase();
    fake.state.nextError = { code: "XX000" };
    requireOrganizationMember.mockResolvedValue(access(fake.client));
    const { listGrantMilestoneEvidence } = await import("./evidence-server");

    await expect(
      listGrantMilestoneEvidence(ORG_A, VAULT_A),
    ).rejects.toMatchObject({ status: 503 });
  });
});
