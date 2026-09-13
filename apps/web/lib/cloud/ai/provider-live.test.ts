import { expect, it, vi } from "vitest";
import { createAiRateLimiter } from "./rate-limit";
import { buildTemplateDraft } from "./template-service";
import { buildEvidenceReview } from "./review-service";

vi.mock("server-only", () => ({}));
const { resolveAiProvider } = await import("./config");

/** Opt-in only. Synthetic data; no Supabase reads, evidence ingestion or wallet calls. */
it.skipIf(process.env.HASHVEST_LIVE_AI !== "1")(
  "live configured provider supports both advisory schemas in every locale",
  async () => {
    const config = resolveAiProvider();
    expect(Boolean(config)).toBe(true);
    for (const locale of ["en", "es", "zh-CN"]) {
      const template = await buildTemplateDraft({
        prompt:
          "Reusable builder template: 40% prototype, 60% release, milestone strategy. No default allocation.",
        locale,
        wallet: "synthetic-smoke",
        limiter: createAiRateLimiter(),
        config,
      });
      expect(
        Boolean(template.draft),
        `Template model response (${locale})`,
      ).toBe(true);
      const review = await buildEvidenceReview({
        config,
        locale,
        address: "0x0000000000000000000000000000000000000001",
        evidence: [],
        snapshot: {
          blockNumber: "1",
          blockTimestamp: Math.floor(Date.now() / 1000),
          title: "Synthetic build",
          strategy: 1,
          totalAllocation: "100",
          claimedAmount: "0",
          unlockedAmount: "0",
          claimableAmount: "0",
          revoked: false,
          milestones: [
            { index: 0, title: "Prototype", amount: "100", approved: false },
          ],
        },
      });
      expect(Boolean(review.review), `Review model response (${locale})`).toBe(
        true,
      );
      expect(review.review?.recommendation.value).not.toBe("approve");
    }
  },
  120000,
);
