import {
  closedSchema,
  InvalidAiToolOutput,
  objectValue,
  prose,
  textSchema,
} from "./template";

export type ReviewSnapshot = {
  blockNumber: string;
  blockTimestamp: number;
  title: string;
  strategy: number;
  totalAllocation: string;
  claimedAmount: string;
  unlockedAmount: string;
  claimableAmount: string;
  revoked: boolean;
  milestones: {
    index: number;
    title: string;
    amount: string;
    approved: boolean;
  }[];
};
export type ReviewSource = {
  id: string;
  kind: "chain" | "evidence";
  href: string | null;
  updatedAt: string;
  milestoneIndex?: number;
};
export type ReviewStatement = { text: string; sourceIds: string[] };
export type AiReview = {
  summary: ReviewStatement[];
  findings: ReviewStatement[];
  questions: ReviewStatement[];
  uncertainty: ReviewStatement[];
  recommendation: {
    value: "approve" | "request_information" | "insufficient_information";
    rationale: ReviewStatement;
  };
};
export type AiReviewResult = {
  review: AiReview | null;
  sources: ReviewSource[];
  snapshot: ReviewSnapshot;
  checkedAt: string;
  missingNotes: boolean;
  redacted: boolean;
};
const statement = closedSchema({
  text: textSchema,
  sourceIds: { type: "array", items: textSchema },
});
const statements = { type: "array", items: statement };
export const AI_REVIEW_SCHEMA = {
  name: "grant_evidence_review",
  strict: true,
  schema: closedSchema({
    summary: statements,
    findings: statements,
    questions: statements,
    uncertainty: statements,
    recommendation: closedSchema({
      value: {
        type: "string",
        enum: ["approve", "request_information", "insufficient_information"],
      },
      rationale: statement,
    }),
  }),
};

export function parseReview(
  raw: string,
  sources: readonly ReviewSource[],
  canSuggestApproval: boolean,
): AiReview {
  if (raw.length > 24000) throw new InvalidAiToolOutput();
  let value: Record<string, unknown>;
  try {
    value = objectValue(JSON.parse(raw));
  } catch {
    throw new InvalidAiToolOutput();
  }
  const ids = new Set(sources.map((source) => source.id));
  function parseStatement(input: unknown): ReviewStatement {
    const record = objectValue(input);
    if (
      !Array.isArray(record.sourceIds) ||
      record.sourceIds.length < 1 ||
      record.sourceIds.length > 21 ||
      record.sourceIds.some((id) => typeof id !== "string" || !ids.has(id))
    )
      throw new InvalidAiToolOutput();
    return {
      text: prose(record.text),
      sourceIds: [...new Set(record.sourceIds as string[])],
    };
  }
  function list(input: unknown) {
    if (!Array.isArray(input) || input.length > 8)
      throw new InvalidAiToolOutput();
    return input.map(parseStatement);
  }
  const recommendation = objectValue(value.recommendation);
  if (
    recommendation.value !== "approve" &&
    recommendation.value !== "request_information" &&
    recommendation.value !== "insufficient_information"
  )
    throw new InvalidAiToolOutput();
  if (recommendation.value === "approve" && !canSuggestApproval)
    throw new InvalidAiToolOutput();
  const result = {
    summary: list(value.summary),
    findings: list(value.findings),
    questions: list(value.questions),
    uncertainty: list(value.uncertainty),
    recommendation: {
      value: recommendation.value,
      rationale: parseStatement(recommendation.rationale),
    },
  };
  if (!result.summary.length || !result.uncertainty.length)
    throw new InvalidAiToolOutput();
  return result as AiReview;
}

/** Semantic comparison excludes block height: polling alone should not stale a review. */
export function reviewStateKey(
  snapshot: Pick<
    ReviewSnapshot,
    | "milestones"
    | "claimedAmount"
    | "unlockedAmount"
    | "claimableAmount"
    | "revoked"
  >,
) {
  return JSON.stringify([
    snapshot.revoked,
    String(snapshot.claimedAmount),
    String(snapshot.unlockedAmount),
    String(snapshot.claimableAmount),
    snapshot.milestones.map((item) => [
      item.title,
      String(item.amount),
      item.approved,
    ]),
  ]);
}
