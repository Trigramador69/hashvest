/**
 * Turns a parsed draft into a preset the wizard can accept (HAS-16).
 *
 * `parseAiGrantDraft` guarantees types; this guarantees *semantics*. A draft
 * can be well-formed and still impossible — a time grant carrying milestones,
 * a cliff longer than its own schedule, percentages that add up to 93, an
 * allocation larger than the demo faucet can fund. Rejecting all of those
 * would make the feature brittle for no gain, because every value stays
 * editable afterwards. So each one is corrected and *reported*: the user sees
 * exactly what was changed on their behalf before they submit anything.
 *
 * Adjustments are codes rather than sentences. This module is layer-neutral
 * and holds no translator; the UI resolves `ai.adjustment.<code>` in the
 * active locale.
 */

import { assertValidPreset } from "../grant-presets/apply-preset";
import {
  GENERATED_PRESET_KEY,
  type GrantPreset,
  type GrantPresetMilestone,
  type GrantPresetTiming,
} from "../grant-presets/presets";
import { InvalidAiDraftError, type ParsedAiDraft } from "./parse-draft";
import {
  AI_MAX_ALLOCATION,
  AI_MAX_MILESTONES,
  AI_MAX_SCHEDULE_SECONDS,
  type AiGrantDraft,
} from "./schema";

export type AiAdjustmentCode =
  | "allocationClamped"
  | "cliffClamped"
  | "durationDefaulted"
  | "durationClamped"
  | "timingDefaulted"
  | "timingDropped"
  | "milestonesDefaulted"
  | "milestonesDropped"
  | "milestonesTruncated"
  | "milestoneTitlesFilled"
  | "percentagesRescaled"
  | "fieldsDropped"
  | "proseRedacted"
  // Request-level notes, added by the caller rather than by normalization.
  | "offlineDraft"
  | "scheduleConverted"
  | "allocationAssumed"
  | "requestAddressIgnored"
  | "requestSecretIgnored"
  | "requestActionIgnored";

export type AiAdjustment = {
  /** Suffix of an `ai.adjustment.*` translation key. */
  code: AiAdjustmentCode;
  values?: Record<string, string | number>;
};

export type NormalizedAiDraft = {
  preset: GrantPreset;
  adjustments: AiAdjustment[];
  /** What the draft itself said it could not honour. */
  unsupported: string[];
};

/** The wizard's own blank defaults, so a defaulted schedule looks untouched. */
const DEFAULT_TIMING: GrantPresetTiming = {
  unit: "60",
  cliff: "0",
  duration: "5",
  realWorldNote: "",
};

/**
 * Rescales whole-number percentages to add up to exactly 100.
 *
 * Largest-remainder, then a repair pass so no milestone rounds away to zero:
 * a milestone worth nothing is a row the user has to delete rather than a
 * split they can edit.
 */
function rescaleToHundred(percentages: number[]): number[] {
  const total = percentages.reduce((sum, percent) => sum + percent, 0);
  if (total === 100) return percentages;
  if (total <= 0) {
    const even = Math.floor(100 / percentages.length);
    const shares = percentages.map(() => even);
    shares[shares.length - 1] += 100 - even * percentages.length;
    return shares;
  }

  const exact = percentages.map((percent) => (percent * 100) / total);
  const shares = exact.map((value) => Math.floor(value));
  let remainder = 100 - shares.reduce((sum, share) => sum + share, 0);
  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);
  for (let step = 0; remainder > 0; step += 1, remainder -= 1)
    shares[byFraction[step % shares.length].index] += 1;

  for (let index = 0; index < shares.length; index += 1) {
    if (shares[index] > 0) continue;
    const donor = shares.indexOf(Math.max(...shares));
    shares[donor] -= 1;
    shares[index] += 1;
  }
  return shares;
}

function normalizeAllocation(
  draft: AiGrantDraft,
  adjustments: AiAdjustment[],
): string {
  const amount = Number(draft.allocation);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new InvalidAiDraftError("The draft's token amount is not usable.");
  if (amount <= Number(AI_MAX_ALLOCATION)) return draft.allocation;
  adjustments.push({
    code: "allocationClamped",
    values: { requested: draft.allocation, maximum: AI_MAX_ALLOCATION },
  });
  return AI_MAX_ALLOCATION;
}

function normalizeTiming(
  draft: AiGrantDraft,
  adjustments: AiAdjustment[],
): GrantPresetTiming | null {
  const needsTiming = draft.strategy !== 1;

  if (!needsTiming) {
    if (draft.timing) adjustments.push({ code: "timingDropped" });
    return null;
  }
  if (!draft.timing) {
    adjustments.push({ code: "timingDefaulted" });
    return { ...DEFAULT_TIMING };
  }

  let { cliff, duration } = draft.timing;
  if (duration === "0") {
    duration = DEFAULT_TIMING.duration;
    adjustments.push({ code: "durationDefaulted", values: { duration } });
  }
  // A duration written in seconds when the unit is already seconds-per-step
  // is well-formed and absurd. Clamp it rather than submit a grant that
  // finishes in the year 40,000.
  const maxSteps = BigInt(AI_MAX_SCHEDULE_SECONDS) / BigInt(draft.timing.unit);
  if (BigInt(duration) > maxSteps) {
    adjustments.push({
      code: "durationClamped",
      values: { requested: duration, maximum: String(maxSteps) },
    });
    duration = String(maxSteps);
  }

  if (BigInt(cliff) > BigInt(duration)) {
    adjustments.push({ code: "cliffClamped", values: { cliff, duration } });
    cliff = duration;
  }
  return { ...draft.timing, cliff, duration };
}

function normalizeMilestones(
  draft: AiGrantDraft,
  adjustments: AiAdjustment[],
): GrantPresetMilestone[] | null {
  const needsMilestones = draft.strategy !== 0;

  if (!needsMilestones) {
    if (draft.milestones?.length)
      adjustments.push({ code: "milestonesDropped" });
    return null;
  }
  if (!draft.milestones?.length) {
    adjustments.push({ code: "milestonesDefaulted" });
    return [{ title: draft.title, percentOfAllocation: 100 }];
  }

  let entries = draft.milestones;
  if (entries.length > AI_MAX_MILESTONES) {
    entries = entries.slice(0, AI_MAX_MILESTONES);
    adjustments.push({
      code: "milestonesTruncated",
      values: { maximum: AI_MAX_MILESTONES },
    });
  }

  const percentages = rescaleToHundred(
    entries.map((entry) => entry.percentOfAllocation),
  );
  if (
    percentages.some(
      (percent, index) => percent !== entries[index].percentOfAllocation,
    )
  )
    adjustments.push({ code: "percentagesRescaled" });

  let filled = false;
  const milestones = entries.map((entry, index) => {
    const title = entry.title || `${draft.title} ${index + 1}`;
    if (!entry.title) filled = true;
    return { title, percentOfAllocation: percentages[index] };
  });
  if (filled) adjustments.push({ code: "milestoneTitlesFilled" });
  return milestones;
}

/**
 * Normalizes a parsed draft into a validated preset.
 *
 * Throws `InvalidAiDraftError` only when the draft cannot be rescued at all.
 * The final `assertValidPreset` is deliberately redundant: it is the same
 * gate the hand-written catalog passes, so a generated draft can never reach
 * the wizard through a weaker check than a built-in preset does.
 */
export function normalizeAiDraft(parsed: ParsedAiDraft): NormalizedAiDraft {
  const { draft, droppedFields, redactions } = parsed;
  const adjustments: AiAdjustment[] = [];

  if (droppedFields.length)
    adjustments.push({
      code: "fieldsDropped",
      values: { count: droppedFields.length, fields: droppedFields.join(", ") },
    });
  if (redactions.length) adjustments.push({ code: "proseRedacted" });

  const allocation = normalizeAllocation(draft, adjustments);
  const timing = normalizeTiming(draft, adjustments);
  const milestones = normalizeMilestones(draft, adjustments);

  const preset: GrantPreset = {
    key: GENERATED_PRESET_KEY,
    // Card chrome is rendered from the `ai.*` dictionary, not from here: this
    // copy would otherwise be the one part of a draft that is never localized.
    name: "AI draft",
    tagline: draft.description || draft.title,
    description: draft.description,
    bestFor: [],
    strategy: draft.strategy,
    titleSuggestion: draft.title,
    descriptionSuggestion: draft.description || undefined,
    allocationSuggestion: allocation,
    timing,
    milestones,
    reviewerRequired: draft.strategy !== 0,
    assumptions: draft.assumptions,
  };

  assertValidPreset(preset);
  return { preset, adjustments, unsupported: draft.unsupported };
}
