import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ApiError } from "../../shared/api-error";
import type { OrganizationTemplateContent } from "../../shared/grant-presets/organization-template";
import {
  archiveOrganizationTemplate,
  createOrganizationTemplate,
  getOrganizationTemplate,
  listOrganizationTemplates,
  updateOrganizationTemplate,
  type TemplateAccess,
} from "./templates";
import type { Database } from "./types";
import { InputValidationError } from "./validation";

const ORG_A = "0a0a0a0a-0000-4000-8000-00000000000a";
const ORG_B = "0b0b0b0b-0000-4000-8000-00000000000b";
const OWNER_WALLET = "0x00000000000000000000000000000000000000aa";
const MEMBER_WALLET = "0x00000000000000000000000000000000000000bb";
const TEMPLATE_A1 = "a1a1a1a1-0000-4000-8000-0000000000a1";
const TEMPLATE_A2 = "a2a2a2a2-0000-4000-8000-0000000000a2";
const TEMPLATE_A_ARCHIVED = "a3a3a3a3-0000-4000-8000-0000000000a3";
const TEMPLATE_B1 = "b1b1b1b1-0000-4000-8000-0000000000b1";

type Row = Record<string, unknown>;
type Filter = { column: string; value: unknown };

/**
 * A minimal in-memory stand-in for the Supabase query builder. Filters are
 * applied for real, so a query that forgot its organization filter would see
 * or change another organization's rows and fail the isolation tests.
 */
function fakeSupabase(seed: Row[]) {
  const state = {
    rows: seed.map((row) => ({ ...row })),
    writes: [] as { op: "insert" | "update"; payload: Row; matched: number }[],
    nextError: null as { code: string } | null,
  };

  function from(table: string) {
    expect(table).toBe("organization_templates");
    let op: "select" | "insert" | "update" = "select";
    let payload: Row = {};
    const filters: Filter[] = [];
    let order: { column: string; ascending: boolean } | undefined;

    const matches = (row: Row) =>
      filters.every((filter) => row[filter.column] === filter.value);

    function run(): { data: Row[] | null; error: { code: string } | null } {
      if (state.nextError) {
        const error = state.nextError;
        state.nextError = null;
        return { data: null, error };
      }
      if (op === "insert") {
        const now = new Date().toISOString();
        const row: Row = {
          id: crypto.randomUUID(),
          version: 1,
          created_at: now,
          updated_at: now,
          archived_at: null,
          ...payload,
        };
        state.rows.push(row);
        state.writes.push({ op, payload, matched: 1 });
        return { data: [row], error: null };
      }
      if (op === "update") {
        const hits = state.rows.filter(matches);
        for (const row of hits) Object.assign(row, payload);
        state.writes.push({ op, payload, matched: hits.length });
        return { data: hits, error: null };
      }
      const data = state.rows.filter(matches);
      if (order) {
        const { column, ascending } = order;
        data.sort(
          (left, right) =>
            String(left[column]).localeCompare(String(right[column])) *
            (ascending ? 1 : -1),
        );
      }
      return { data, error: null };
    }

    const builder = {
      select: () => builder,
      insert(value: Row) {
        op = "insert";
        payload = value;
        return builder;
      },
      update(value: Row) {
        op = "update";
        payload = value;
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return builder;
      },
      is(column: string, value: unknown) {
        filters.push({ column, value });
        return builder;
      },
      order(column: string, options?: { ascending?: boolean }) {
        order = { column, ascending: options?.ascending ?? true };
        return builder;
      },
      single: async () => {
        const result = run();
        return result.error
          ? result
          : { data: result.data?.[0] ?? null, error: null };
      },
      maybeSingle: async () => {
        const result = run();
        return result.error
          ? result
          : { data: result.data?.[0] ?? null, error: null };
      },
      then<Result>(
        resolve: (value: ReturnType<typeof run>) => Result,
        reject?: (reason: unknown) => Result,
      ) {
        return Promise.resolve(run()).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    state,
  };
}

function row(
  id: string,
  organizationId: string,
  name: string,
  extra: Row = {},
): Row {
  return {
    id,
    organization_id: organizationId,
    version: 1,
    name,
    description: null,
    strategy: 0,
    schedule_unit_seconds: 60,
    cliff_units: 1,
    duration_units: 4,
    milestones: null,
    allocation_suggestion: null,
    default_reviewer_member_id: null,
    created_by_wallet: OWNER_WALLET,
    updated_by_wallet: OWNER_WALLET,
    created_at: "2026-09-13T00:00:00.000Z",
    updated_at: "2026-09-13T00:00:00.000Z",
    archived_at: null,
    ...extra,
  };
}

function setup() {
  const fake = fakeSupabase([
    row(TEMPLATE_A2, ORG_A, "Zeta vesting"),
    row(TEMPLATE_A1, ORG_A, "Alpha vesting"),
    row(TEMPLATE_A_ARCHIVED, ORG_A, "Old vesting", {
      archived_at: "2026-09-12T00:00:00.000Z",
    }),
    row(TEMPLATE_B1, ORG_B, "Other organization"),
  ]);
  const access = (
    isOwner: boolean,
    organizationId = ORG_A,
  ): TemplateAccess => ({
    supabase: fake.client,
    organizationId,
    membership: { isOwner },
    walletAddress: isOwner ? OWNER_WALLET : MEMBER_WALLET,
  });
  return {
    ...fake,
    owner: access(true),
    member: access(false),
    find: (id: string) =>
      fake.state.rows.find((candidate) => candidate.id === id),
  };
}

const CONTENT: OrganizationTemplateContent = {
  name: "Builder grant",
  description: "Scoped build with two deliverables.",
  strategy: 2,
  schedule: { unitSeconds: 86400, cliffUnits: 0, durationUnits: 90 },
  milestones: [
    { title: "Prototype", percentOfAllocation: 30 },
    { title: "Launch", percentOfAllocation: 70 },
  ],
  allocationSuggestion: "5000",
  defaultReviewerMemberId: "c1c1c1c1-0000-4000-8000-0000000000c1",
};

async function expectStatus(promise: Promise<unknown>, status: number) {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
}

describe("organization isolation", () => {
  it("lists only this organization's active templates, by name", async () => {
    const { owner, member } = setup();
    for (const access of [owner, member]) {
      const templates = await listOrganizationTemplates(access);
      expect(templates.map((template) => template.id)).toEqual([
        TEMPLATE_A1,
        TEMPLATE_A2,
      ]);
    }
  });

  it("treats another organization's template as not found", async () => {
    const { owner } = setup();
    await expectStatus(getOrganizationTemplate(owner, TEMPLATE_B1), 404);
  });

  it("never updates another organization's template", async () => {
    const { owner, find } = setup();
    const before = { ...find(TEMPLATE_B1) };
    await expectStatus(
      updateOrganizationTemplate(owner, TEMPLATE_B1, CONTENT, 1),
      404,
    );
    expect(find(TEMPLATE_B1)).toEqual(before);
  });

  it("never archives another organization's template", async () => {
    const { owner, find } = setup();
    await expectStatus(archiveOrganizationTemplate(owner, TEMPLATE_B1), 404);
    expect(find(TEMPLATE_B1)?.archived_at).toBeNull();
  });

  it("creates templates in the caller's organization only", async () => {
    const { owner } = setup();
    const created = await createOrganizationTemplate(owner, CONTENT);
    expect(created.organizationId).toBe(ORG_A);
  });
});

describe("owner authorization", () => {
  it("lets the owner create, update, and archive", async () => {
    const { owner } = setup();
    const created = await createOrganizationTemplate(owner, CONTENT);
    const updated = await updateOrganizationTemplate(
      owner,
      created.id,
      { ...CONTENT, name: "Builder grant v2" },
      created.version,
    );
    expect(updated.name).toBe("Builder grant v2");
    await archiveOrganizationTemplate(owner, created.id);
    await expectStatus(getOrganizationTemplate(owner, created.id), 404);
  });

  it("lets a member read but refuses every mutation before any write", async () => {
    const { member, state } = setup();
    await expect(
      getOrganizationTemplate(member, TEMPLATE_A1),
    ).resolves.toMatchObject({
      id: TEMPLATE_A1,
    });
    await expectStatus(createOrganizationTemplate(member, CONTENT), 403);
    await expectStatus(
      updateOrganizationTemplate(member, TEMPLATE_A1, CONTENT, 1),
      403,
    );
    await expectStatus(archiveOrganizationTemplate(member, TEMPLATE_A1), 403);
    expect(state.writes).toEqual([]);
  });
});

describe("stored content", () => {
  it("takes authorship from the session and stores only designed columns", async () => {
    const { owner, state } = setup();
    // An untyped caller smuggling authoritative or identity fields.
    const smuggled = {
      ...CONTENT,
      organization_id: ORG_B,
      created_by_wallet: MEMBER_WALLET,
      beneficiary: "0x00000000000000000000000000000000000000ff",
      total_allocation: "1",
    } as unknown as OrganizationTemplateContent;
    await createOrganizationTemplate(owner, smuggled);

    const [write] = state.writes;
    expect(Object.keys(write.payload).sort()).toEqual(
      [
        "allocation_suggestion",
        "cliff_units",
        "created_by_wallet",
        "default_reviewer_member_id",
        "description",
        "duration_units",
        "milestones",
        "name",
        "organization_id",
        "schedule_unit_seconds",
        "strategy",
        "updated_by_wallet",
      ].sort(),
    );
    expect(write.payload.organization_id).toBe(ORG_A);
    expect(write.payload.created_by_wallet).toBe(OWNER_WALLET);
    expect(write.payload.updated_by_wallet).toBe(OWNER_WALLET);
  });

  it("maps a stored row back to the domain shape", async () => {
    const { owner } = setup();
    const created = await createOrganizationTemplate(owner, CONTENT);
    expect(created).toMatchObject({
      name: CONTENT.name,
      strategy: 2,
      schedule: CONTENT.schedule,
      milestones: CONTENT.milestones,
      allocationSuggestion: "5000",
      defaultReviewerMemberId: CONTENT.defaultReviewerMemberId,
      version: 1,
    });
  });
});

describe("versioning", () => {
  it("increments the version on every update", async () => {
    const { owner } = setup();
    const first = await updateOrganizationTemplate(
      owner,
      TEMPLATE_A1,
      CONTENT,
      1,
    );
    const second = await updateOrganizationTemplate(
      owner,
      TEMPLATE_A1,
      { ...CONTENT, name: "Renamed" },
      first.version,
    );
    expect([first.version, second.version]).toEqual([2, 3]);
  });

  it("refuses a stale version without changing the template", async () => {
    const { owner, find } = setup();
    await updateOrganizationTemplate(owner, TEMPLATE_A1, CONTENT, 1);
    const before = { ...find(TEMPLATE_A1) };
    await expectStatus(
      updateOrganizationTemplate(
        owner,
        TEMPLATE_A1,
        { ...CONTENT, name: "Lost update" },
        1,
      ),
      409,
    );
    expect(find(TEMPLATE_A1)).toEqual(before);
  });

  it("does not update or re-archive an archived template", async () => {
    const { owner } = setup();
    await expectStatus(
      updateOrganizationTemplate(owner, TEMPLATE_A_ARCHIVED, CONTENT, 1),
      404,
    );
    await expectStatus(
      archiveOrganizationTemplate(owner, TEMPLATE_A_ARCHIVED),
      404,
    );
  });
});

describe("failures", () => {
  it("maps database constraint violations to actionable responses", async () => {
    for (const [code, status] of [
      ["23505", 409],
      ["23503", 400],
      ["23514", 400],
      ["08006", 503],
    ] as const) {
      const { owner, state } = setup();
      state.nextError = { code };
      await expectStatus(createOrganizationTemplate(owner, CONTENT), status);
    }
  });

  it("rejects a malformed template id before querying", async () => {
    const { owner } = setup();
    await expect(getOrganizationTemplate(owner, "not-a-uuid")).rejects.toThrow(
      InputValidationError,
    );
  });
});
