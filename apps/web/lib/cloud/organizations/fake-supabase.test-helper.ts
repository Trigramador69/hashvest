import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * A minimal in-memory stand-in for the Supabase query builder, for tests.
 *
 * Filters are applied for real, so a query that forgets its organization or
 * membership filter sees or changes the wrong rows and fails a test instead of
 * passing by accident. Every write is recorded, so a test can assert that a
 * refused request wrote nothing.
 *
 * Supports exactly the builder calls the workspace code uses: select, insert,
 * update, eq, is, order, single, maybeSingle, and awaiting a query directly.
 */

export type FakeRow = Record<string, unknown>;

export type FakeWrite = {
  table: string;
  op: "insert" | "update";
  payload: FakeRow;
  matched: number;
};

export type FakeSupabase = {
  client: SupabaseClient<Database>;
  tables: Record<string, FakeRow[]>;
  writes: FakeWrite[];
  /** The next query on any table fails with this Postgres error code. */
  failNext: (code: string) => void;
};

type Result = { data: FakeRow[] | null; error: { code: string } | null };

export function createFakeSupabase(
  seed: Record<string, FakeRow[]>,
  defaults: Record<string, () => FakeRow> = {},
): FakeSupabase {
  const tables: Record<string, FakeRow[]> = Object.fromEntries(
    Object.entries(seed).map(([name, rows]) => [
      name,
      rows.map((row) => ({ ...row })),
    ]),
  );
  const writes: FakeWrite[] = [];
  let nextError: { code: string } | null = null;

  function from(table: string) {
    const rows = tables[table];
    if (!rows) throw new Error(`Unexpected table in test: ${table}`);
    let op: "select" | "insert" | "update" = "select";
    let payload: FakeRow = {};
    const filters: { column: string; value: unknown }[] = [];
    let order: { column: string; ascending: boolean } | undefined;

    const matches = (row: FakeRow) =>
      filters.every((filter) => row[filter.column] === filter.value);

    function run(): Result {
      if (nextError) {
        const error = nextError;
        nextError = null;
        return { data: null, error };
      }
      if (op === "insert") {
        const row = { ...(defaults[table]?.() ?? {}), ...payload };
        rows.push(row);
        writes.push({ table, op, payload, matched: 1 });
        return { data: [row], error: null };
      }
      if (op === "update") {
        const hits = rows.filter(matches);
        for (const row of hits) Object.assign(row, payload);
        writes.push({ table, op, payload, matched: hits.length });
        return { data: hits, error: null };
      }
      const data = rows.filter(matches);
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

    const first = (
      result: Result,
    ): Result | { data: FakeRow | null; error: null } =>
      result.error ? result : { data: result.data?.[0] ?? null, error: null };

    const builder = {
      select: () => builder,
      insert(value: FakeRow) {
        op = "insert";
        payload = value;
        return builder;
      },
      update(value: FakeRow) {
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
      single: async () => first(run()),
      maybeSingle: async () => first(run()),
      then<Value>(
        resolve: (value: Result) => Value,
        reject?: (reason: unknown) => Value,
      ) {
        return Promise.resolve(run()).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    tables,
    writes,
    failNext: (code) => {
      nextError = { code };
    },
  };
}

/** Column defaults the database would fill for a new template row. */
export function templateRowDefaults(): FakeRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    version: 1,
    created_at: now,
    updated_at: now,
    archived_at: null,
  };
}
