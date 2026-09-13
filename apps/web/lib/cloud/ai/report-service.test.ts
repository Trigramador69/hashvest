import { describe, expect, it } from "vitest";

import type { OrganizationReport } from "../../dashboard/organization-report";
import { reportStateKey } from "../../shared/ai-tools/report";
import { buildReportSummary } from "./report-service";

const report: OrganizationReport = {
  generatedAt: 1789257600000,
  readAt: 1789257600000,
  associatedGrants: 3,
  readableGrants: 3,
  unreadableVaults: [],
  partial: false,
  lifecycle: { active: 2, completed: 1, revoked: 0 },
  viewer: { pendingReviews: 1, claimableGrants: 0 },
  tokenGroups: [
    {
      token: "0x0000000000000000000000000000000000000010",
      symbol: "HVT",
      decimals: 18,
      grantCount: 3,
      totalAllocation: 3_000_000_000_000_000_000n,
      unlockedAmount: 1_000_000_000_000_000_000n,
      unvestedAmount: 2_000_000_000_000_000_000n,
      claimedAmount: 0n,
      claimableAmount: 1_000_000_000_000_000_000n,
      vaultAddresses: ["0x0000000000000000000000000000000000000003"],
    },
  ],
  upcomingUnlocks: [
    {
      vaultAddress: "0x0000000000000000000000000000000000000003",
      title: "Integration release",
      kind: "cliff",
      at: 1789344000,
      symbol: "HVT",
    },
  ],
};

const statement = (text: string, sourceIds = ["lifecycle"]) => ({
  text,
  sourceIds,
});
const summary = {
  summary: [statement("Two grants are active and one has completed.")],
  watchlist: [statement("One cliff releases next week.", ["unlocks"])],
  uncertainty: [
    statement("Amounts are HVT base units and were not converted.", [
      "token-0",
    ]),
  ],
};
const config = {
  baseUrl: "https://provider.example",
  model: "test",
  apiKey: "test-provider-secret",
  maxOutputTokens: 2500,
};
const completion =
  (value: unknown): typeof fetch =>
  async () =>
    Response.json({
      choices: [{ message: { content: JSON.stringify(value) } }],
    });
const options = () => ({
  report,
  omitted: 0,
  locale: "en",
  config,
  fetchImpl: completion(summary),
});

describe("HAS-17 organization report summary", () => {
  it("grounds every statement in a section the reader can open", async () => {
    const result = await buildReportSummary(options());
    expect(result.report?.summary[0].sourceIds).toEqual(["lifecycle"]);
    expect(result.sources.map((source) => source.id)).toEqual([
      "lifecycle",
      "viewer",
      "token-0",
      "unlocks",
    ]);
    expect(result.sources.every((source) => source.anchor)).toBe(true);
    expect(result.facts.tokenGroups[0].totalAllocation).toBe("3");
  });

  it("never sends vault addresses, wallets or the provider secret", async () => {
    let body = "";
    const urls: string[] = [];
    await buildReportSummary({
      ...options(),
      fetchImpl: async (url, init) => {
        urls.push(String(url));
        body = String(init?.body);
        return completion(summary)(url, init);
      },
    });
    expect(urls).toEqual([`${config.baseUrl}/chat/completions`]);
    for (const value of [
      report.tokenGroups[0].token,
      report.tokenGroups[0].vaultAddresses[0],
      config.apiKey,
    ])
      expect(body).not.toContain(value);
    expect(JSON.parse(body)).not.toHaveProperty("tools");
  });

  it.each([
    ["a fiat amount", "The portfolio is worth $4,200 today."],
    ["a conversion", "1 HVT converts to about 2 USD."],
    ["a yield claim", "The treasury earns 4% APY on the unvested amount."],
    ["a cross-token total", "The combined total across all tokens is 3."],
  ])("rejects %s the product cannot know", async (_label, text) => {
    const result = await buildReportSummary({
      ...options(),
      fetchImpl: completion({ ...summary, summary: [statement(text)] }),
    });
    expect(result.report).toBeNull();
    // The figures the page already shows survive a rejected narrative.
    expect(result.facts.lifecycle.active).toBe(2);
  });

  it("rejects invented citations and empty required sections", async () => {
    for (const value of [
      { ...summary, summary: [statement("Invented.", ["token-9"])] },
      { ...summary, uncertainty: [] },
      { ...summary, summary: [statement("x".repeat(601))] },
    ])
      expect(
        (
          await buildReportSummary({
            ...options(),
            fetchImpl: completion(value),
          })
        ).report,
      ).toBeNull();
  });

  it("refuses a narrative that treats an unread vault as an empty one", async () => {
    const partial = {
      ...report,
      partial: true,
      readableGrants: 2,
      unreadableVaults: ["0x0000000000000000000000000000000000000004"],
    };
    // Same answer, but now it omits the fact that a vault could not be read.
    expect(
      (
        await buildReportSummary({
          ...options(),
          report: partial,
          fetchImpl: completion(summary),
        })
      ).report,
    ).toBeNull();
    const honest = {
      ...summary,
      uncertainty: [
        statement("One vault could not be read and is absent, not zero.", [
          "unreadable",
        ]),
      ],
    };
    const result = await buildReportSummary({
      ...options(),
      report: partial,
      fetchImpl: completion(honest),
    });
    expect(result.report?.uncertainty[0].sourceIds).toEqual(["unreadable"]);
    expect(result.sources.some((source) => source.id === "unreadable")).toBe(
      true,
    );
  });

  it("treats vaults past the read limit as partial too", async () => {
    const result = await buildReportSummary({
      ...options(),
      omitted: 4,
      fetchImpl: completion(summary),
    });
    expect(result.facts.omittedGrants).toBe(4);
    expect(result.facts.partial).toBe(true);
    expect(result.report).toBeNull();
  });

  it.each([401, 403, 429, 500])(
    "keeps the report readable on upstream %i",
    async (status) => {
      const result = await buildReportSummary({
        ...options(),
        fetchImpl: async () => new Response(config.apiKey, { status }),
      });
      expect(result.report).toBeNull();
      expect(JSON.stringify(result)).not.toContain(config.apiKey);
    },
  );

  it("works without a configured provider", async () => {
    const result = await buildReportSummary({ ...options(), config: null });
    expect(result.report).toBeNull();
    expect(result.facts.readableGrants).toBe(3);
  });

  it("ages a summary on real change, not on re-reading the same state", () => {
    const key = (input: OrganizationReport) =>
      reportStateKey({
        lifecycle: input.lifecycle,
        viewer: input.viewer,
        tokenGroups: input.tokenGroups,
        unreadableVaults: input.unreadableVaults,
      });
    expect(key(report)).toBe(
      key({ ...report, generatedAt: 1, readAt: 2 } as OrganizationReport),
    );
    expect(key(report)).not.toBe(
      key({ ...report, lifecycle: { active: 3, completed: 1, revoked: 0 } }),
    );
  });
});
