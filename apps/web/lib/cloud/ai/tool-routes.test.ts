import "server-only";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../organizations/fake-supabase.test-helper";
import { aiRateLimiter } from "./rate-limit";

const state = vi.hoisted(() => ({
  session: null as null | {
    walletAddress: string;
    chainId: 133;
    expiresAt: string;
  },
  database: undefined as unknown,
  snapshot: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloud/auth/session", () => ({
  readSession: async () => state.session,
  AuthConfigurationError: class extends Error {},
}));
vi.mock("@/lib/cloud/supabase-server", () => ({
  createSupabaseAdmin: () => state.database,
  ServerConfigurationError: class extends Error {},
}));
vi.mock("@/lib/cloud/ai/config", () => ({
  resolveAiProvider: () => ({
    apiKey: "test-secret",
    baseUrl: "https://provider.example",
    model: "test",
    maxOutputTokens: 2500,
  }),
}));
vi.mock("@/lib/protocol/verify", () => ({
  verifyGrantVault: vi.fn(),
  readGrantReviewSnapshot: state.snapshot,
}));

const templateRoute =
  await import("@/app/api/organizations/[organizationId]/ai/template-draft/route");
const reviewRoute =
  await import("@/app/api/organizations/[organizationId]/grants/[vaultAddress]/ai/review/route");
const ORG = "aaaaaaaa-0000-4000-8000-000000000001";
const OTHER = "bbbbbbbb-0000-4000-8000-000000000002";
const OWNER = "0x0000000000000000000000000000000000000001";
const MEMBER = "0x0000000000000000000000000000000000000002";
const VAULT = "0x0000000000000000000000000000000000000003";
const generated = {
  name: "Reviewed template",
  description: null,
  strategy: 0,
  schedule: { unitSeconds: 86400, cliffUnits: 0, durationUnits: 365 },
  milestones: null,
  allocationSuggestion: null,
  assumptions: [],
  unsupported: [],
};
const fetchMock = vi.fn(async () =>
  Response.json({
    choices: [{ message: { content: JSON.stringify(generated) } }],
  }),
);
let database: ReturnType<typeof createFakeSupabase>;
beforeEach(() => {
  aiRateLimiter.reset();
  fetchMock.mockClear();
  state.snapshot.mockReset();
  state.session = {
    walletAddress: OWNER,
    chainId: 133,
    expiresAt: "2030-01-01T00:00:00Z",
  };
  database = createFakeSupabase({
    organizations: [
      { id: ORG, name: "A" },
      { id: OTHER, name: "B" },
    ],
    organization_members: [
      {
        id: "owner",
        organization_id: ORG,
        wallet_address: OWNER,
        is_owner: true,
      },
      {
        id: "member",
        organization_id: ORG,
        wallet_address: MEMBER,
        is_owner: false,
      },
    ],
    organization_grants: [
      { organization_id: ORG, chain_id: 133, vault_address: VAULT },
    ],
    organization_grant_milestone_evidence: [
      {
        chain_id: 133,
        vault_address: VAULT,
        milestone_index: 0,
        evidence_type: "document",
        evidence_url: "https://example.org/private",
        note: "Private workspace note",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
  });
  state.database = database.client;
  state.snapshot.mockResolvedValue({
    blockNumber: "1",
    blockTimestamp: 1789257600,
    title: "Grant",
    strategy: 1,
    totalAllocation: "100",
    claimedAmount: "0",
    unlockedAmount: "0",
    claimableAmount: "0",
    revoked: false,
    milestones: [{ index: 0, title: "Build", amount: "100", approved: false }],
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
function request(
  body: unknown = { prompt: "Create an annual template", locale: "es" },
  origin?: string,
) {
  return new Request("http://localhost:3000/api/ai", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}
const templateContext = (organizationId = ORG) => ({
  params: Promise.resolve({ organizationId }),
});
const reviewContext = (organizationId = ORG, vaultAddress = VAULT) => ({
  params: Promise.resolve({ organizationId, vaultAddress }),
});

describe("HAS-19 authorized template route", () => {
  it("generates for an owner without persisting any template or prompt", async () => {
    const before = JSON.stringify(database.tables);
    const response = await templateRoute.POST(request(), templateContext());
    expect(response.status).toBe(200);
    expect(
      (await response.json()).draft.template.defaultReviewerMemberId,
    ).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(database.tables)).toBe(before);
    expect(database.writes).toEqual([]);
  });
  it("rejects members, outsiders and missing sessions before provider access", async () => {
    for (const wallet of [
      MEMBER,
      "0x0000000000000000000000000000000000000009",
      null,
    ]) {
      state.session = wallet
        ? { walletAddress: wallet, chainId: 133, expiresAt: "2030-01-01" }
        : null;
      const response = await templateRoute.POST(request(), templateContext());
      expect(response.status).toBe(wallet ? 403 : 401);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and oversized chunked requests", async () => {
    expect(
      (
        await templateRoute.POST(
          request({}, "https://attacker.example"),
          templateContext(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await templateRoute.POST(
          request({ prompt: "x".repeat(5000) }),
          templateContext(),
        )
      ).status,
    ).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("shares rate limits with review and returns Retry-After", async () => {
    for (let index = 0; index < 5; index++)
      aiRateLimiter.consume(OWNER, Date.now());
    const response = await templateRoute.POST(request(), templateContext());
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
describe("HAS-17 authorized review route", () => {
  it("allows members, reads actual state and ignores browser-supplied evidence or amounts", async () => {
    state.session!.walletAddress = MEMBER;
    const response = await reviewRoute.POST(
      request({
        locale: "en",
        totalAllocation: "999999",
        evidence: "attacker invented context",
      }),
      reviewContext(),
    );
    expect(response.status).toBe(200);
    expect(state.snapshot).toHaveBeenCalledWith(VAULT);
    const result = await response.json();
    expect(result.snapshot.totalAllocation).toBe("100");
    expect(JSON.stringify(result)).not.toContain("attacker");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects other organizations and unassociated grants before RPC or model calls", async () => {
    expect(
      (await reviewRoute.POST(request({}), reviewContext(OTHER))).status,
    ).toBe(403);
    expect(
      (await reviewRoute.POST(request({}), reviewContext(ORG, OWNER))).status,
    ).toBe(404);
    expect(state.snapshot).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not leak evidence on unauthenticated or failed chain reads", async () => {
    state.session = null;
    expect((await reviewRoute.POST(request({}), reviewContext())).status).toBe(
      401,
    );
    state.session = {
      walletAddress: MEMBER,
      chainId: 133,
      expiresAt: "2030-01-01",
    };
    state.snapshot.mockRejectedValueOnce(new Error("Private workspace note"));
    const response = await reviewRoute.POST(request({}), reviewContext());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("Private workspace note");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
