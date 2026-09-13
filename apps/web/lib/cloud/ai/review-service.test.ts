import { describe, expect, it } from "vitest";
import {
  parseReview,
  reviewStateKey,
  type ReviewSnapshot,
} from "../../shared/ai-tools/review";
import { buildEvidenceReview } from "./review-service";
import type { OrganizationMilestoneEvidence } from "../organizations/types";

const address = "0x0000000000000000000000000000000000000001";
const snapshot: ReviewSnapshot = {
  blockNumber: "123",
  blockTimestamp: 1789257600,
  title: "Integration",
  strategy: 1,
  totalAllocation: "100",
  claimedAmount: "0",
  unlockedAmount: "0",
  claimableAmount: "0",
  revoked: false,
  milestones: [{ index: 0, title: "Release", amount: "100", approved: false }],
};
const evidence: OrganizationMilestoneEvidence = {
  chainId: 133,
  vaultAddress: address,
  milestoneIndex: 0,
  evidenceType: "github_pr",
  evidenceUrl: "https://example.org/private?token=never-send",
  note: "The submitter says the release is complete but tests still fail.",
  submittedByWallet: address,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const statement = (text: string, sourceIds = ["chain"]) => ({
  text,
  sourceIds,
});
const review = {
  summary: [statement("The milestone is pending.")],
  findings: [
    statement("The note claims completion while reporting failing tests.", [
      "evidence-0",
    ]),
  ],
  questions: [statement("Can you supply passing tests?", ["evidence-0"])],
  uncertainty: [statement("Linked content was not read.", ["evidence-0"])],
  recommendation: {
    value: "request_information",
    rationale: statement("The note is contradictory.", ["evidence-0"]),
  },
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
  snapshot,
  evidence: [evidence],
  address: address as `0x${string}`,
  config,
  locale: "en",
  fetchImpl: completion(review),
});

describe("HAS-17 evidence review", () => {
  it("grounds contradictions and questions in supplied notes and current reads", async () => {
    const result = await buildEvidenceReview(options());
    expect(result.review?.findings[0].sourceIds).toEqual(["evidence-0"]);
    expect(result.sources[1].href).toBe(evidence.evidenceUrl);
    expect(result.review?.recommendation.value).toBe("request_information");
    // An old note has no invented expiration date or invalid status.
    expect(result.sources[1].updatedAt).toBe(evidence.updatedAt);
  });
  it("does not fetch URLs, send wallet identities, query strings or raw secrets", async () => {
    const urls: string[] = [];
    const secret = `0x${"a".repeat(64)}`;
    let body = "";
    const result = await buildEvidenceReview({
      ...options(),
      evidence: [
        {
          ...evidence,
          note: `Use ${secret} and https://private.example/?password=hidden`,
        },
      ],
      fetchImpl: async (url, init) => {
        urls.push(String(url));
        body = String(init?.body);
        return completion(review)(url, init);
      },
    });
    expect(urls).toEqual([`${config.baseUrl}/chat/completions`]);
    for (const value of [
      address,
      secret,
      "never-send",
      "password=hidden",
      config.apiKey,
    ])
      expect(body).not.toContain(value);
    expect(JSON.parse(body)).not.toHaveProperty("tools");
    expect(result.redacted).toBe(true);
    expect(result.missingNotes).toBe(false);
  });
  it("marks missing and link-only notes and refuses approval without usable evidence", async () => {
    for (const input of [
      [],
      [{ ...evidence, note: null }],
      [{ ...evidence, note: evidence.evidenceUrl }],
    ]) {
      const result = await buildEvidenceReview({
        ...options(),
        evidence: input,
        fetchImpl: completion({
          ...review,
          findings: [],
          questions: [],
          uncertainty: [statement("No notes supplied.")],
          recommendation: {
            value: "approve",
            rationale: statement("Approve now."),
          },
        }),
      });
      expect(result.missingNotes).toBe(true);
      expect(result.review).toBeNull();
    }
  });
  it("rejects fabricated citations and action-shaped responses", async () => {
    for (const value of [
      { ...review, summary: [statement("Invented", ["evidence-99"])] },
      {
        ...review,
        recommendation: {
          value: "approveMilestone",
          rationale: statement("Execute"),
        },
      },
      { ...review, uncertainty: [] },
      { ...review, summary: [statement("x".repeat(601))] },
    ]) {
      expect(
        (
          await buildEvidenceReview({
            ...options(),
            fetchImpl: completion(value),
          })
        ).review,
      ).toBeNull();
    }
  });
  it("never offers approval on a revoked or fully approved grant", async () => {
    const approving = {
      ...review,
      recommendation: {
        value: "approve",
        rationale: statement("Review complete"),
      },
    };
    for (const updated of [
      { ...snapshot, revoked: true },
      {
        ...snapshot,
        milestones: [{ ...snapshot.milestones[0], approved: true }],
      },
    ])
      expect(
        (
          await buildEvidenceReview({
            ...options(),
            snapshot: updated,
            fetchImpl: completion(approving),
          })
        ).review,
      ).toBeNull();
  });
  it.each([401, 403, 429, 500])(
    "preserves sources and manual review on upstream %i",
    async (status) => {
      const result = await buildEvidenceReview({
        ...options(),
        fetchImpl: async () => new Response(config.apiKey, { status }),
      });
      expect(result.review).toBeNull();
      expect(result.sources).toHaveLength(2);
      expect(JSON.stringify(result)).not.toContain(config.apiKey);
    },
  );
  it("works without configuration and bounds malformed output", async () => {
    expect(
      (await buildEvidenceReview({ ...options(), config: null })).review,
    ).toBeNull();
    expect(
      (
        await buildEvidenceReview({
          ...options(),
          fetchImpl: async () => new Response("x".repeat(128001)),
        })
      ).review,
    ).toBeNull();
    expect(() => parseReview("x".repeat(24001), [], false)).toThrow();
  });
  it("detects meaningful changes independently of block polling", () => {
    expect(reviewStateKey(snapshot)).toBe(
      reviewStateKey({ ...snapshot, blockNumber: "124" } as ReviewSnapshot),
    );
    expect(reviewStateKey(snapshot)).not.toBe(
      reviewStateKey({ ...snapshot, claimedAmount: "50" }),
    );
  });
});
