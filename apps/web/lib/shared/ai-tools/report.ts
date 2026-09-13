import {
  closedSchema,
  InvalidAiToolOutput,
  objectValue,
  prose,
  textSchema,
} from "./template";

/**
 * A source the reader can check on the Reports page itself.
 *
 * Every id names a section that page already renders, so verifying a cited
 * claim is a scroll, not an act of faith. The model never authors an id.
 */
export type ReportSource = {
  id: string;
  kind: "lifecycle" | "viewer" | "token" | "unlocks" | "unreadable";
  /** Anchor on the Reports page; the UI links a citation straight to it. */
  anchor: string;
  symbol?: string;
};

export type ReportStatement = { text: string; sourceIds: string[] };

export type AiReport = {
  summary: ReportStatement[];
  watchlist: ReportStatement[];
  uncertainty: ReportStatement[];
};

/**
 * The facts the server read, flattened to strings.
 *
 * Amounts stay per token group and keep their symbol, because the product has
 * no price feed: two tokens are two reports, never one number.
 */
export type ReportFacts = {
  associatedGrants: number;
  readableGrants: number;
  includedGrants: number;
  omittedGrants: number;
  partial: boolean;
  lifecycle: { active: number; completed: number; revoked: number };
  viewer: { pendingReviews: number; claimableGrants: number };
  tokenGroups: {
    sourceId: string;
    symbol: string;
    grantCount: number;
    totalAllocation: string;
    unlockedAmount: string;
    unvestedAmount: string;
    claimedAmount: string;
    claimableAmount: string;
  }[];
  upcomingUnlocks: { title: string; kind: string; at: string }[];
  unreadableVaults: number;
};

export type AiReportResult = {
  report: AiReport | null;
  sources: ReportSource[];
  facts: ReportFacts;
  checkedAt: string;
  redacted: boolean;
};

const statement = closedSchema({
  text: textSchema,
  sourceIds: { type: "array", items: textSchema },
});
const statements = { type: "array", items: statement };

export const AI_REPORT_SCHEMA = {
  name: "organization_report_summary",
  strict: true,
  schema: closedSchema({
    summary: statements,
    watchlist: statements,
    uncertainty: statements,
  }),
};

/**
 * Money the product cannot know.
 *
 * HashVest has no price feed, so a fiat figure, a conversion, a TVL or a yield
 * is not a rounding error in the prose — it is an invented fact about value.
 * The system prompt forbids it; this rejects it, which is the half that holds
 * when a model ignores an instruction.
 */
const INVENTED_VALUE =
  /\$|€|£|¥|\b(?:usd|usdt|usdc|eur|gbp|fiat|tvl|apr|apy|yield|roi|市值|美元)\b|\b(?:worth|valued|value[ds]?|priced?|converts?|conversion|exchange rate)\b/i;

/**
 * A total that crosses token groups.
 *
 * "Across all tokens" is the shape of the mistake: summing two ERC20s with
 * different decimals produces a number that means nothing.
 */
const CROSS_TOKEN =
  /\b(?:across (?:all |both )?(?:tokens|assets)|combined total|total across|grand total|all tokens combined)\b/i;

export function reportProse(value: unknown): string {
  const text = prose(value);
  if (INVENTED_VALUE.test(text) || CROSS_TOKEN.test(text))
    throw new InvalidAiToolOutput();
  return text;
}

export function parseReportSummary(
  raw: string,
  sources: readonly ReportSource[],
  facts: ReportFacts,
): AiReport {
  if (raw.length > 24000) throw new InvalidAiToolOutput();
  let value: Record<string, unknown>;
  try {
    value = objectValue(JSON.parse(raw));
  } catch {
    throw new InvalidAiToolOutput();
  }
  const ids = new Set(sources.map((source) => source.id));
  function parseStatement(input: unknown): ReportStatement {
    const record = objectValue(input);
    if (
      !Array.isArray(record.sourceIds) ||
      record.sourceIds.length < 1 ||
      record.sourceIds.length > 12 ||
      record.sourceIds.some(
        (id) => typeof id !== "string" || !ids.has(id as string),
      )
    )
      throw new InvalidAiToolOutput();
    return {
      text: reportProse(record.text),
      sourceIds: [...new Set(record.sourceIds as string[])],
    };
  }
  function list(input: unknown) {
    if (!Array.isArray(input) || input.length > 8)
      throw new InvalidAiToolOutput();
    return input.map(parseStatement);
  }
  const result = {
    summary: list(value.summary),
    watchlist: list(value.watchlist),
    uncertainty: list(value.uncertainty),
  };
  if (!result.summary.length || !result.uncertainty.length)
    throw new InvalidAiToolOutput();
  // A vault that could not be read is absent, not zero. If the reader is
  // looking at a partial report, the narrative has to say so out loud.
  if (
    (facts.partial || facts.omittedGrants > 0) &&
    ![...result.summary, ...result.watchlist, ...result.uncertainty].some(
      (item) => item.sourceIds.includes("unreadable"),
    )
  )
    throw new InvalidAiToolOutput();
  return result;
}

/**
 * Semantic comparison for staleness.
 *
 * Excludes `generatedAt` and `readAt`: re-reading the same chain state should
 * not age a summary that is still true. Mirrors `reviewStateKey`.
 */
export function reportStateKey(input: {
  lifecycle: { active: number; completed: number; revoked: number };
  tokenGroups: readonly {
    symbol: string;
    totalAllocation: bigint | string;
    unlockedAmount: bigint | string;
    claimedAmount: bigint | string;
    claimableAmount: bigint | string;
  }[];
  unreadableVaults: readonly string[];
  viewer: { pendingReviews: number; claimableGrants: number };
}) {
  return JSON.stringify([
    input.lifecycle.active,
    input.lifecycle.completed,
    input.lifecycle.revoked,
    input.viewer.pendingReviews,
    input.viewer.claimableGrants,
    input.tokenGroups.map((group) => [
      group.symbol,
      String(group.totalAllocation),
      String(group.unlockedAmount),
      String(group.claimedAmount),
      String(group.claimableAmount),
    ]),
    [...input.unreadableVaults].sort(),
  ]);
}
