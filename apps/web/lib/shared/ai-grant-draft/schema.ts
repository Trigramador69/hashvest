/**
 * The AI Grant Builder draft contract (HAS-16).
 *
 * A draft is a *preset*, not a grant. It carries only the plain strings and
 * whole numbers a user could have typed into the wizard, so it can be fed
 * through the same `assertValidPreset` → `applyPresetToDraft` path as the
 * hand-written catalog in ../grant-presets. `prepare()` in
 * apps/web/app/grants/new/page.tsx therefore remains the single source of
 * truth for what is actually submitted onchain.
 *
 * What a draft deliberately cannot express — and what no model output may
 * introduce — is anything that selects an identity or moves value:
 * beneficiary, reviewer, token, eligibility provider, start timestamp,
 * revocability, or any transaction. Those fields are absent from the type, so
 * a suggestion of one cannot even be represented, let alone submitted.
 *
 * This module is layer-neutral: it imports neither `@/lib/cloud` nor
 * `@/lib/protocol`, by alias or by relative path.
 */

import { MAX_PRESET_MILESTONES } from "../grant-presets/apply-preset";

/** The wizard's schedule <select> values, in seconds. */
export const AI_SCHEDULE_UNITS = ["60", "3600", "86400"] as const;

export type AiScheduleUnit = (typeof AI_SCHEDULE_UNITS)[number];

/** Shorter than a tweet: a grant description, not a conversation. */
export const AI_PROMPT_MIN_LENGTH = 8;
export const AI_PROMPT_MAX_LENGTH = 400;

/**
 * One `DemoToken` faucet click mints exactly 1,000 hvUSD and the wizard
 * refuses to create a grant it cannot fully fund, so a larger suggestion
 * would be a draft the demo can never submit.
 */
export const AI_MAX_ALLOCATION = "1000";

export const AI_MAX_MILESTONES = MAX_PRESET_MILESTONES;
export const AI_MAX_ASSUMPTIONS = 6;
export const AI_MAX_UNSUPPORTED = 6;

/** Mirrors the wizard's own maxLength attributes and the Supabase check constraints. */
export const AI_TITLE_MAX_LENGTH = 120;
export const AI_DESCRIPTION_MAX_LENGTH = 1000;
export const AI_MILESTONE_TITLE_MAX_LENGTH = 120;
export const AI_NOTE_MAX_LENGTH = 280;

/** Output and cost guardrails. A draft is small; anything larger is a symptom. */
export const AI_MAX_OUTPUT_TOKENS = 700;
export const AI_REQUEST_TIMEOUT_MS = 15_000;
export const AI_TEMPERATURE = 0.2;

export type AiGrantDraftMilestone = {
  title: string;
  /** Whole number. The set must add up to 100. */
  percentOfAllocation: number;
};

export type AiGrantDraftTiming = {
  unit: AiScheduleUnit;
  cliff: string;
  duration: string;
  realWorldNote: string;
};

export type AiGrantDraft = {
  /** 0 = TIME, 1 = MILESTONE, 2 = HYBRID. Mirrors UnlockStrategy in GrantTypes.sol. */
  strategy: 0 | 1 | 2;
  title: string;
  description: string;
  /** Decimal token amount, e.g. "1000". */
  allocation: string;
  /** Required for strategy 0 and 2; null for pure MILESTONE (1). */
  timing: AiGrantDraftTiming | null;
  /** Required for strategy 1 and 2; null for pure TIME (0). */
  milestones: AiGrantDraftMilestone[] | null;
  /** Every non-obvious choice the draft made for the user. */
  assumptions: string[];
  /** Anything in the request the draft could not honour, stated plainly. */
  unsupported: string[];
};

/**
 * The JSON Schema handed to the provider as a `response_format` hint.
 *
 * It is a hint and nothing more. Providers disagree on how strictly they
 * honour it and a compromised or simply bad response can ignore it entirely,
 * so `parseAiGrantDraft` re-derives the draft from scratch and
 * `assertValidPreset` re-checks the strategy rules. Never treat a 200 from a
 * provider as validation.
 */
export const AI_GRANT_DRAFT_JSON_SCHEMA = {
  name: "hashvest_grant_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "strategy",
      "title",
      "description",
      "allocation",
      "timing",
      "milestones",
      "assumptions",
      "unsupported",
    ],
    properties: {
      strategy: {
        type: "integer",
        enum: [0, 1, 2],
        description:
          "0 = time vesting, 1 = milestone grant, 2 = hybrid (both conditions apply).",
      },
      title: { type: "string", maxLength: AI_TITLE_MAX_LENGTH },
      description: { type: "string", maxLength: AI_DESCRIPTION_MAX_LENGTH },
      allocation: {
        type: "string",
        description: `Decimal token amount as a string, at most ${AI_MAX_ALLOCATION}.`,
      },
      timing: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["unit", "cliff", "duration", "realWorldNote"],
        properties: {
          unit: { type: "string", enum: [...AI_SCHEDULE_UNITS] },
          cliff: {
            type: "string",
            description: "Whole number of units. Never greater than duration.",
          },
          duration: {
            type: "string",
            description: "Whole number of units, greater than zero.",
          },
          realWorldNote: { type: "string", maxLength: AI_NOTE_MAX_LENGTH },
        },
      },
      milestones: {
        type: ["array", "null"],
        maxItems: AI_MAX_MILESTONES,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "percentOfAllocation"],
          properties: {
            title: {
              type: "string",
              maxLength: AI_MILESTONE_TITLE_MAX_LENGTH,
            },
            percentOfAllocation: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
      },
      assumptions: {
        type: "array",
        maxItems: AI_MAX_ASSUMPTIONS,
        items: { type: "string", maxLength: AI_NOTE_MAX_LENGTH },
      },
      unsupported: {
        type: "array",
        maxItems: AI_MAX_UNSUPPORTED,
        items: { type: "string", maxLength: AI_NOTE_MAX_LENGTH },
      },
    },
  },
} as const;
