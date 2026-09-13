import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../shared/api-error";
import type { Database } from "./types";

vi.mock("server-only", () => ({}));

const ORG_A = "0a0a0a0a-0000-4000-8000-00000000000a";
const ORG_B = "0b0b0b0b-0000-4000-8000-00000000000b";
const VAULT_A = "0x00000000000000000000000000000000000000aa";
const VAULT_B = "0x00000000000000000000000000000000000000bb";
const MEMBER = "0x00000000000000000000000000000000000000c1";
const OTHER_MEMBER = "0x00000000000000000000000000000000000000c2";

const requireOrganizationMember = vi.fn();
vi.mock("./server", () => ({ requireOrganizationMember }));

type Row = Record<string, unknown>;

/**
 * A stand-in for the query builder that applies filters for real, so a query
 * that forgets its member filter reads another member's rows and fails here.
 */
function fakeSupabase(seed: Row[] = []) {
  const grants: Row[] = [
    { organization_id: ORG_A, chain_id: 133, vault_address: VAULT_A },
    { organization_id: ORG_B, chain_id: 133, vault_address: VAULT_B },
  ];
  const reads: Row[] = seed.map((row) => ({ ...row }));
  const state = { reads, nextError: null as { code: string } | null };

  function from(table: string) {
    let operation: "select" | "upsert" | "delete" = "select";
    let payload: Row[] = [];
    const filters: { column: string; value: unknown }[] = [];
    const inFilters: { column: string; values: unknown[] }[] = [];
    let order: { column: string; ascending: boolean } | undefined;

    function rows() {
      if (table === "organization_grants") return grants;
      if (table === "organization_notification_reads") return reads;
      throw new Error(`Unexpected table ${table}`);
    }

    const matches = (row: Row) =>
      filters.every((filter) => row[filter.column] === filter.value) &&
      inFilters.every((filter) => filter.values.includes(row[filter.column]));

    function execute() {
      if (state.nextError) {
        const error = state.nextError;
        state.nextError = null;
        return { data: null, error };
      }
      if (operation === "upsert") {
        const written: Row[] = [];
        for (const item of payload) {
          const existing = reads.find(
            (row) =>
              row.organization_id === item.organization_id &&
              row.member_wallet === item.member_wallet &&
              row.notification_key === item.notification_key,
          );
          if (existing) Object.assign(existing, item);
          else reads.push({ ...item });
          written.push(existing ?? reads[reads.length - 1]);
        }
        return { data: written, error: null };
      }
      if (operation === "delete") {
        const doomed = rows().filter(matches);
        for (const row of doomed) rows().splice(rows().indexOf(row), 1);
        return { data: doomed, error: null };
      }
      const data = rows().filter(matches);
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
      upsert(value: Row[]) {
        operation = "upsert";
        payload = value;
        return builder;
      },
      delete() {
        operation = "delete";
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return builder;
      },
      in(column: string, values: unknown[]) {
        inFilters.push({ column, values });
        return builder;
      },
      order(column: string, options?: { ascending?: boolean }) {
        order = { column, ascending: options?.ascending ?? true };
        return builder;
      },
      maybeSingle: async () => {
        const result = execute();
        return result.error
          ? result
          : { data: result.data?.[0] ?? null, error: null };
      },
      then<Value>(
        resolve: (value: ReturnType<typeof execute>) => Value,
        reject?: (reason: unknown) => Value,
      ) {
        return Promise.resolve(execute()).then(resolve, reject);
      },
    };
    return builder;
  }

  return { client: { from } as unknown as SupabaseClient<Database>, state };
}

function grantAccess(
  supabase: ReturnType<typeof fakeSupabase>,
  organizationId = ORG_A,
  walletAddress = MEMBER,
) {
  requireOrganizationMember.mockResolvedValue({
    supabase: supabase.client,
    session: { walletAddress, chainId: 133, expiresAt: "" },
    organization: { id: organizationId, name: "Org" },
    membership: { walletAddress, isOwner: false },
  });
}

async function load() {
  return import("./notification-reads-server");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listNotificationReads", () => {
  it("returns only the calling member's own marks", async () => {
    const supabase = fakeSupabase([
      {
        organization_id: ORG_A,
        member_wallet: MEMBER,
        notification_key: `${VAULT_A}:claimable`,
        chain_id: 133,
        vault_address: VAULT_A,
        read_at: "2026-09-13T00:00:00.000Z",
      },
      {
        organization_id: ORG_A,
        member_wallet: OTHER_MEMBER,
        notification_key: `${VAULT_A}:milestone-pending:0`,
        chain_id: 133,
        vault_address: VAULT_A,
        read_at: "2026-09-13T00:00:00.000Z",
      },
    ]);
    grantAccess(supabase);
    const { listNotificationReads } = await load();
    const result = await listNotificationReads(ORG_A);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      memberWallet: MEMBER,
      notificationKey: `${VAULT_A}:claimable`,
      chainId: 133,
    });
  });

  it("does not read another organization's marks", async () => {
    const supabase = fakeSupabase([
      {
        organization_id: ORG_B,
        member_wallet: MEMBER,
        notification_key: `${VAULT_B}:claimable`,
        chain_id: 133,
        vault_address: VAULT_B,
        read_at: "2026-09-13T00:00:00.000Z",
      },
    ]);
    grantAccess(supabase, ORG_A);
    const { listNotificationReads } = await load();
    expect(await listNotificationReads(ORG_A)).toEqual([]);
  });

  it("reports a database failure as unavailable, not as an empty list", async () => {
    const supabase = fakeSupabase();
    supabase.state.nextError = { code: "PGRST500" };
    grantAccess(supabase);
    const { listNotificationReads } = await load();
    await expect(listNotificationReads(ORG_A)).rejects.toBeInstanceOf(ApiError);
  });

  it("refuses a caller who is not a member", async () => {
    requireOrganizationMember.mockRejectedValue(
      new ApiError(403, "You are not a member of this organization."),
    );
    const { listNotificationReads } = await load();
    await expect(listNotificationReads(ORG_A)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("markNotificationsRead", () => {
  it("stores a mark against the calling member and the named vault", async () => {
    const supabase = fakeSupabase();
    grantAccess(supabase);
    const { markNotificationsRead } = await load();
    const result = await markNotificationsRead(ORG_A, [
      { notificationKey: `${VAULT_A}:claimable`, vaultAddress: VAULT_A },
    ]);
    expect(result[0]).toMatchObject({
      memberWallet: MEMBER,
      vaultAddress: VAULT_A,
      notificationKey: `${VAULT_A}:claimable`,
    });
    expect(supabase.state.reads).toHaveLength(1);
  });

  it("marking the same key twice keeps one row", async () => {
    const supabase = fakeSupabase();
    grantAccess(supabase);
    const { markNotificationsRead } = await load();
    const input = [
      { notificationKey: `${VAULT_A}:claimable`, vaultAddress: VAULT_A },
    ];
    await markNotificationsRead(ORG_A, input);
    await markNotificationsRead(ORG_A, input);
    expect(supabase.state.reads).toHaveLength(1);
  });

  it("refuses a vault the organization is not associated with", async () => {
    const supabase = fakeSupabase();
    grantAccess(supabase, ORG_A);
    const { markNotificationsRead } = await load();
    await expect(
      markNotificationsRead(ORG_A, [
        { notificationKey: `${VAULT_B}:claimable`, vaultAddress: VAULT_B },
      ]),
    ).rejects.toMatchObject({ status: 404 });
    expect(supabase.state.reads).toEqual([]);
  });

  it("refuses a batch larger than the request limit and writes nothing", async () => {
    const supabase = fakeSupabase();
    grantAccess(supabase);
    const { markNotificationsRead, NOTIFICATION_READ_BATCH_LIMIT } =
      await load();
    await expect(
      markNotificationsRead(
        ORG_A,
        Array.from({ length: NOTIFICATION_READ_BATCH_LIMIT + 1 }, (_, i) => ({
          notificationKey: `${VAULT_A}:claimable:${i}`,
          vaultAddress: VAULT_A,
        })),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(supabase.state.reads).toEqual([]);
  });

  it("writes nothing for an empty batch", async () => {
    const supabase = fakeSupabase();
    grantAccess(supabase);
    const { markNotificationsRead } = await load();
    expect(await markNotificationsRead(ORG_A, [])).toEqual([]);
    expect(requireOrganizationMember).not.toHaveBeenCalled();
  });

  it("drops the oldest marks once the member is over the retention cap", async () => {
    const { NOTIFICATION_READ_RETENTION } = await load();
    const supabase = fakeSupabase(
      Array.from({ length: NOTIFICATION_READ_RETENTION }, (_, index) => ({
        organization_id: ORG_A,
        member_wallet: MEMBER,
        notification_key: `${VAULT_A}:old:${String(index).padStart(4, "0")}`,
        chain_id: 133,
        vault_address: VAULT_A,
        // Lexicographically ordered, so the fake sorts them like timestamps.
        read_at: `2026-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
      })),
    );
    grantAccess(supabase);
    const { markNotificationsRead } = await load();
    await markNotificationsRead(ORG_A, [
      { notificationKey: `${VAULT_A}:claimable`, vaultAddress: VAULT_A },
    ]);
    expect(supabase.state.reads).toHaveLength(NOTIFICATION_READ_RETENTION);
    const keys = supabase.state.reads.map((row) => row.notification_key);
    expect(keys).toContain(`${VAULT_A}:claimable`);
    expect(keys).not.toContain(`${VAULT_A}:old:0000`);
  });
});
