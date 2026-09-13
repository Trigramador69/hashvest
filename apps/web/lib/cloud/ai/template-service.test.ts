import { describe, expect, it } from "vitest";
import { parseTemplateDraft } from "../../shared/ai-tools/template";
import { applyOrganizationTemplateToDraft } from "../../shared/grant-presets/organization-template";
import { buildTemplateDraft } from "./template-service";
import { createAiRateLimiter } from "./rate-limit";

const draft = {
  name: "Builder program",
  description: "Reusable milestone configuration",
  strategy: 1,
  schedule: null,
  milestones: [
    { title: "Prototype", percentOfAllocation: 40 },
    { title: "Release", percentOfAllocation: 60 },
  ],
  allocationSuggestion: "5000",
  assumptions: ["The owner will choose a reviewer."],
  unsupported: [],
};
const config = {
  apiKey: "test-provider-secret",
  model: "test",
  baseUrl: "https://provider.example",
  maxOutputTokens: 2500,
};
const options = () => ({
  prompt: "A reusable builder program",
  locale: "es",
  wallet: "owner",
  config,
  limiter: createAiRateLimiter(),
});
const completion =
  (value: unknown): typeof fetch =>
  async () =>
    Response.json({
      choices: [{ message: { content: JSON.stringify(value) } }],
    });

describe("HAS-19 template drafts", () => {
  it("accepts all three strategies through the ordinary template validator and application path", () => {
    for (const strategy of [0, 1, 2]) {
      const parsed = parseTemplateDraft(
        JSON.stringify({
          ...draft,
          strategy,
          schedule:
            strategy === 1
              ? null
              : { unitSeconds: 86400, cliffUnits: 30, durationUnits: 365 },
          milestones: strategy === 0 ? null : draft.milestones,
        }),
      );
      expect(parsed.template.defaultReviewerMemberId).toBeNull();
      const applied = applyOrganizationTemplateToDraft({
        ...parsed.template,
        id: "a0000000-0000-4000-8000-000000000001",
        version: 1,
      });
      expect(applied.templateKey).toContain("org-template:");
    }
  });
  it.each([
    { strategy: 3 },
    { strategy: "1" },
    { name: "x".repeat(81) },
    { milestones: [{ title: "Build", percentOfAllocation: 90 }] },
    { milestones: [{ title: "Build", percentOfAllocation: "100" }] },
    {
      strategy: 0,
      milestones: null,
      schedule: { unitSeconds: 60, cliffUnits: 6, durationUnits: 5 },
    },
    { allocationSuggestion: "-1" },
    { schedule: {} },
    { assumptions: ["x".repeat(601)] },
  ])("rejects invalid output before an editor can save it: %j", (patch) => {
    expect(() =>
      parseTemplateDraft(JSON.stringify({ ...draft, ...patch })),
    ).toThrow();
  });
  it("drops identities and executable fields, and redacts prose", () => {
    const address = `0x${"a".repeat(40)}`;
    const parsed = parseTemplateDraft(
      JSON.stringify({
        ...draft,
        name: `Grant ${address}`,
        beneficiary: address,
        defaultReviewerMemberId: "chosen-by-model",
        transaction: { action: "approve" },
      }),
    );
    expect(parsed.template.defaultReviewerMemberId).toBeNull();
    expect(JSON.stringify(parsed)).not.toContain(address);
    expect(parsed.template).not.toHaveProperty("transaction");
    expect(parsed.redacted).toBe(true);
  });
  it.each([401, 403, 429, 500])(
    "preserves manual creation on upstream %i",
    async (status) => {
      const result = await buildTemplateDraft({
        ...options(),
        fetchImpl: async () =>
          new Response("sensitive upstream body", { status }),
      });
      expect(result).toEqual({ draft: null, unavailable: true });
    },
  );
  it("returns no generated template for missing configuration, malformed output or network failure", async () => {
    expect(
      (await buildTemplateDraft({ ...options(), config: null })).draft,
    ).toBeNull();
    expect(
      (
        await buildTemplateDraft({
          ...options(),
          fetchImpl: completion({ ...draft, milestones: [] }),
        })
      ).draft,
    ).toBeNull();
    expect(
      (
        await buildTemplateDraft({
          ...options(),
          fetchImpl: async () => {
            throw new Error(config.apiKey);
          },
        })
      ).draft,
    ).toBeNull();
  });
  it("redacts the request, constrains output and never gives the provider transaction tools", async () => {
    let sent = "";
    const secret = `0x${"b".repeat(64)}`;
    const result = await buildTemplateDraft({
      ...options(),
      prompt: `Build a grant, sign and send ${secret}`,
      fetchImpl: async (_url, init) => {
        sent = String(init?.body);
        return completion(draft)("https://unused.example");
      },
    });
    expect(sent).not.toContain(secret);
    expect(sent).not.toContain(config.apiKey);
    expect(JSON.parse(sent)).not.toHaveProperty("tools");
    expect(JSON.parse(sent).max_tokens).toBe(2500);
    expect(result.draft?.redacted).toBe(true);
    expect(result.draft?.template.allocationSuggestion).toBe("5000");
  });
  it("shares wallet limits and rejects oversized prompts", async () => {
    const base = {
      ...options(),
      limiter: createAiRateLimiter({ perMinute: 1 }),
      config: null,
    };
    await buildTemplateDraft(base);
    await expect(buildTemplateDraft(base)).rejects.toMatchObject({
      status: 429,
    });
    await expect(
      buildTemplateDraft({ ...options(), prompt: "x".repeat(401) }),
    ).rejects.toThrow();
    expect(() => parseTemplateDraft("x".repeat(24001))).toThrow();
  });
});
