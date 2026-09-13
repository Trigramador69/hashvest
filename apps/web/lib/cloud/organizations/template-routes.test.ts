// Resolves to the mock below: vi.mock is hoisted above every import.
import "server-only";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeSupabase,
  templateRowDefaults,
  type FakeRow,
  type FakeSupabase,
} from "./fake-supabase.test-helper";

/**
 * The template Route Handlers, run for real (HAS-13).
 *
 * Only the edges are replaced: the verified session and the service-role
 * client. Everything between — route parsing, same-origin checks, membership
 * and ownership lookups, template data access, error mapping — is the code
 * that ships.
 */

const state = vi.hoisted(() => ({
  session: null as null | {
    walletAddress: string;
    chainId: 133;
    expiresAt: string;
  },
  database: undefined as unknown,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloud/auth/session", () => ({
  readSession: async () => state.session,
  AuthConfigurationError: class AuthConfigurationError extends Error {},
}));
vi.mock("@/lib/cloud/supabase-server", () => ({
  createSupabaseAdmin: () => state.database,
  ServerConfigurationError: class ServerConfigurationError extends Error {},
}));
vi.mock("@/lib/protocol/verify", () => ({ verifyGrantVault: vi.fn() }));

const collection =
  await import("@/app/api/organizations/[organizationId]/templates/route");
const item =
  await import("@/app/api/organizations/[organizationId]/templates/[templateId]/route");

const ORG_A = "0a0a0a0a-0000-4000-8000-00000000000a";
const ORG_B = "0b0b0b0b-0000-4000-8000-00000000000b";
const OWNER = "0x00000000000000000000000000000000000000aa";
const MEMBER = "0x00000000000000000000000000000000000000bb";
const OTHER_OWNER = "0x00000000000000000000000000000000000000cc";
const OUTSIDER = "0x00000000000000000000000000000000000000dd";
const TEMPLATE_A = "a1a1a1a1-0000-4000-8000-0000000000a1";
const TEMPLATE_A_ARCHIVED = "a3a3a3a3-0000-4000-8000-0000000000a3";
const TEMPLATE_B = "b1b1b1b1-0000-4000-8000-0000000000b1";
const REVIEWER_MEMBER = "c1c1c1c1-0000-4000-8000-0000000000c1";

const CONTENT = {
  name: "Builder grant",
  description: null,
  strategy: 1,
  schedule: null,
  milestones: [
    { title: "Prototype", percentOfAllocation: 30 },
    { title: "Launch", percentOfAllocation: 70 },
  ],
  allocationSuggestion: "5000",
  defaultReviewerMemberId: REVIEWER_MEMBER,
};

function member(
  id: string,
  organizationId: string,
  wallet: string,
  isOwner: boolean,
): FakeRow {
  return {
    id,
    organization_id: organizationId,
    wallet_address: wallet,
    display_name: wallet.slice(-2),
    role_label: null,
    is_owner: isOwner,
    created_at: "2026-09-13T00:00:00.000Z",
    updated_at: "2026-09-13T00:00:00.000Z",
  };
}

function template(
  id: string,
  organizationId: string,
  name: string,
  extra: FakeRow = {},
): FakeRow {
  return {
    ...templateRowDefaults(),
    id,
    organization_id: organizationId,
    name,
    description: null,
    strategy: 0,
    schedule_unit_seconds: 60,
    cliff_units: 1,
    duration_units: 4,
    milestones: null,
    allocation_suggestion: null,
    default_reviewer_member_id: null,
    created_by_wallet: OWNER,
    updated_by_wallet: OWNER,
    ...extra,
  };
}

let database: FakeSupabase;

beforeEach(() => {
  database = createFakeSupabase(
    {
      organizations: [
        { id: ORG_A, name: "Org A", created_by_wallet: OWNER },
        { id: ORG_B, name: "Org B", created_by_wallet: OTHER_OWNER },
      ],
      organization_members: [
        member("a0000000-0000-4000-8000-0000000000a0", ORG_A, OWNER, true),
        member(REVIEWER_MEMBER, ORG_A, MEMBER, false),
        member(
          "b0000000-0000-4000-8000-0000000000b0",
          ORG_B,
          OTHER_OWNER,
          true,
        ),
      ],
      organization_templates: [
        template(TEMPLATE_A, ORG_A, "Active"),
        template(TEMPLATE_A_ARCHIVED, ORG_A, "Archived", {
          archived_at: "2026-09-12T00:00:00.000Z",
        }),
        template(TEMPLATE_B, ORG_B, "Other organization"),
      ],
      organization_grants: [
        {
          organization_id: ORG_A,
          chain_id: 133,
          vault_address: "0x00000000000000000000000000000000000000ee",
          description: null,
          template_key: `org-template:${TEMPLATE_A}@v1`,
          created_by_wallet: OWNER,
          created_at: "2026-09-13T00:00:00.000Z",
        },
      ],
    },
    { organization_templates: templateRowDefaults },
  );
  state.database = database.client;
  state.session = null;
});

function signIn(wallet: string | null) {
  state.session = wallet
    ? {
        walletAddress: wallet,
        chainId: 133,
        expiresAt: "2099-01-01T00:00:00.000Z",
      }
    : null;
}

function request(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const orgParams = (organizationId: string) => ({
  params: Promise.resolve({ organizationId }),
});
const itemParams = (organizationId: string, templateId: string) => ({
  params: Promise.resolve({ organizationId, templateId }),
});

const base = `/api/organizations/${ORG_A}/templates`;
const CROSS_SITE = { "sec-fetch-site": "cross-site" };

const OPERATIONS = {
  list: () => collection.GET(request("GET", base), orgParams(ORG_A)),
  get: () =>
    item.GET(
      request("GET", `${base}/${TEMPLATE_A}`),
      itemParams(ORG_A, TEMPLATE_A),
    ),
  create: () =>
    collection.POST(request("POST", base, CONTENT), orgParams(ORG_A)),
  update: () =>
    item.PATCH(
      request("PATCH", `${base}/${TEMPLATE_A}`, {
        template: CONTENT,
        expectedVersion: 1,
      }),
      itemParams(ORG_A, TEMPLATE_A),
    ),
  archive: () =>
    item.DELETE(
      request("DELETE", `${base}/${TEMPLATE_A}`),
      itemParams(ORG_A, TEMPLATE_A),
    ),
} as const;

type Operation = keyof typeof OPERATIONS;
const READS: Operation[] = ["list", "get"];
const MUTATIONS: Operation[] = ["create", "update", "archive"];

describe("authorization matrix", () => {
  it.each([...READS, ...MUTATIONS])(
    "%s: refuses an unauthenticated request before any write",
    async (operation) => {
      signIn(null);
      const response = await OPERATIONS[operation]();
      expect(response.status).toBe(401);
      expect(database.writes).toEqual([]);
    },
  );

  it.each([...READS, ...MUTATIONS])(
    "%s: refuses a wallet that is not a member before any write",
    async (operation) => {
      signIn(OUTSIDER);
      const response = await OPERATIONS[operation]();
      expect(response.status).toBe(403);
      expect(database.writes).toEqual([]);
    },
  );

  it.each(READS)("%s: lets a member read", async (operation) => {
    signIn(MEMBER);
    expect((await OPERATIONS[operation]()).status).toBe(200);
  });

  it.each(MUTATIONS)(
    "%s: refuses a member before any write",
    async (operation) => {
      signIn(MEMBER);
      const response = await OPERATIONS[operation]();
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Only the organization owner can do that.",
      });
      expect(database.writes).toEqual([]);
    },
  );

  it.each([
    ["list", 200],
    ["get", 200],
    ["create", 201],
    ["update", 200],
    ["archive", 200],
  ] as const)("%s: lets the owner through", async (operation, status) => {
    signIn(OWNER);
    expect((await OPERATIONS[operation]()).status).toBe(status);
  });

  it("does not let an owner of one organization reach another", async () => {
    signIn(OTHER_OWNER);
    for (const operation of [...READS, ...MUTATIONS]) {
      expect((await OPERATIONS[operation]()).status).toBe(403);
    }
    expect(database.writes).toEqual([]);
  });
});

describe("reads", () => {
  it("lists active templates and never caches the response", async () => {
    signIn(MEMBER);
    const response = await OPERATIONS.list();
    expect(response.headers.get("cache-control")).toBe("no-store");
    const { templates } = await response.json();
    expect(templates.map((entry: { id: string }) => entry.id)).toEqual([
      TEMPLATE_A,
    ]);
  });

  it("includes archived templates only when provenance asks for them", async () => {
    signIn(MEMBER);
    const response = await collection.GET(
      request("GET", `${base}?include=archived`),
      orgParams(ORG_A),
    );
    const { templates } = await response.json();
    expect(templates.map((entry: { id: string }) => entry.id).sort()).toEqual(
      [TEMPLATE_A, TEMPLATE_A_ARCHIVED].sort(),
    );
  });

  it("treats another organization's template id as not found", async () => {
    signIn(OWNER);
    const response = await item.GET(
      request("GET", `${base}/${TEMPLATE_B}`),
      itemParams(ORG_A, TEMPLATE_B),
    );
    expect(response.status).toBe(404);
  });

  it("rejects malformed identifiers", async () => {
    signIn(OWNER);
    expect(
      (await collection.GET(request("GET", base), orgParams("not-a-uuid")))
        .status,
    ).toBe(400);
    expect(
      (
        await item.GET(
          request("GET", `${base}/nope`),
          itemParams(ORG_A, "nope"),
        )
      ).status,
    ).toBe(400);
  });
});

describe("writes", () => {
  it("stores only designed fields, authored by the session wallet", async () => {
    signIn(OWNER);
    const response = await collection.POST(
      request("POST", base, {
        ...CONTENT,
        beneficiary: "0x00000000000000000000000000000000000000ff",
        createdByWallet: MEMBER,
        organizationId: ORG_B,
      }),
      orgParams(ORG_A),
    );
    expect(response.status).toBe(201);
    const [write] = database.writes;
    expect(write.payload).not.toHaveProperty("beneficiary");
    expect(write.payload.organization_id).toBe(ORG_A);
    expect(write.payload.created_by_wallet).toBe(OWNER);
  });

  it("rejects an invalid strategy and milestone combination with 400", async () => {
    signIn(OWNER);
    const response = await collection.POST(
      request("POST", base, {
        ...CONTENT,
        milestones: [{ title: "Half", percentOfAllocation: 50 }],
      }),
      orgParams(ORG_A),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/add up to 100/);
    expect(database.writes).toEqual([]);
  });

  it("requires the version an edit was based on", async () => {
    signIn(OWNER);
    const response = await item.PATCH(
      request("PATCH", `${base}/${TEMPLATE_A}`, { template: CONTENT }),
      itemParams(ORG_A, TEMPLATE_A),
    );
    expect(response.status).toBe(400);
    expect(database.writes).toEqual([]);
  });

  it("refuses a stale edit with 409 and keeps the newer revision", async () => {
    signIn(OWNER);
    expect((await OPERATIONS.update()).status).toBe(200);
    const stale = await item.PATCH(
      request("PATCH", `${base}/${TEMPLATE_A}`, {
        template: { ...CONTENT, name: "Lost update" },
        expectedVersion: 1,
      }),
      itemParams(ORG_A, TEMPLATE_A),
    );
    expect(stale.status).toBe(409);
    const row = database.tables.organization_templates.find(
      (candidate) => candidate.id === TEMPLATE_A,
    );
    expect(row?.name).toBe(CONTENT.name);
    expect(row?.version).toBe(2);
  });

  it("archives instead of deleting, so provenance can still name it", async () => {
    signIn(OWNER);
    const grantsBefore = structuredClone(database.tables.organization_grants);
    expect((await OPERATIONS.archive()).status).toBe(200);
    expect(database.writes.map((write) => write.table)).toEqual([
      "organization_templates",
    ]);
    expect(database.tables.organization_grants).toEqual(grantsBefore);
    expect((await OPERATIONS.get()).status).toBe(404);
    const archived = await collection.GET(
      request("GET", `${base}?include=archived`),
      orgParams(ORG_A),
    );
    const { templates } = await archived.json();
    expect(
      templates.find((entry: { id: string }) => entry.id === TEMPLATE_A),
    ).toMatchObject({ name: "Active" });
  });

  it.each([
    [
      "create",
      () =>
        collection.POST(
          request("POST", base, CONTENT, CROSS_SITE),
          orgParams(ORG_A),
        ),
    ],
    [
      "update",
      () =>
        item.PATCH(
          request(
            "PATCH",
            `${base}/${TEMPLATE_A}`,
            { template: CONTENT, expectedVersion: 1 },
            CROSS_SITE,
          ),
          itemParams(ORG_A, TEMPLATE_A),
        ),
    ],
    [
      "archive",
      () =>
        item.DELETE(
          request("DELETE", `${base}/${TEMPLATE_A}`, undefined, CROSS_SITE),
          itemParams(ORG_A, TEMPLATE_A),
        ),
    ],
  ] as const)(
    "%s: refuses a cross-site request from the owner before any write",
    async (_operation, send) => {
      signIn(OWNER);
      const response = await send();
      expect(response.status).toBe(403);
      expect(database.writes).toEqual([]);
    },
  );
});
