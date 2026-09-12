/**
 * Pure preset → wizard mapping (HAS-8).
 *
 * Nothing here touches an address, a signature, or a contract call. It only
 * produces the same plain strings a user could have typed into the wizard,
 * so `validateGrant`/`prepare` in apps/web/app/grants/new/page.tsx remains
 * the single source of truth for what is actually submitted onchain.
 */

import { formatUnits, parseUnits } from "viem";

import type { GrantPreset } from "./presets";

/** The default used when the ERC20's decimals have not loaded yet. Amounts stay editable. */
export const FALLBACK_DECIMALS = 18;

export const MAX_PRESET_MILESTONES = 20;

/** Mirrors TEMPLATE_KEY_MAX_LENGTH in lib/cloud/organizations/validation.ts.
 * lib/shared may import neither layer — by alias or relative path. */
export const MAX_PRESET_KEY_LENGTH = 80;

/** The wizard's schedule <select> values, in seconds. */
const SCHEDULE_UNITS = ["60", "3600", "86400"];

export class InvalidPresetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPresetError";
  }
}

/** Exactly the wizard state a preset may prefill. Every field is editable afterwards. */
export type AppliedPresetDraft = {
  title: string;
  description: string;
  allocation: string;
  strategy: 0 | 1 | 2;
  unit: string;
  cliff: string;
  duration: string;
  milestones: { title: string; amount: string }[];
  reviewerRequired: boolean;
};

/**
 * Rejects preset/strategy combinations the wizard could never accept.
 *
 * TIME (0) grants must not carry reviewer or milestone semantics — the vault
 * writes `zeroAddress` for the reviewer on strategy 0, so suggesting one would
 * be a lie in the UI. MILESTONE (1) has no vesting schedule at all.
 */
export function assertValidPreset(preset: GrantPreset): void {
  const { key, strategy, timing, milestones, reviewerRequired } = preset;

  if (!key.trim() || key !== key.trim() || key.length > MAX_PRESET_KEY_LENGTH)
    throw new InvalidPresetError(
      `Preset keys must be trimmed, non-empty, and at most ${MAX_PRESET_KEY_LENGTH} characters: "${key}".`,
    );

  if (strategy !== 0 && strategy !== 1 && strategy !== 2)
    throw new InvalidPresetError(`${key}: unknown strategy ${strategy}.`);

  const needsTiming = strategy !== 1;
  const needsMilestones = strategy !== 0;

  if (needsTiming && !timing)
    throw new InvalidPresetError(
      `${key}: this strategy requires a vesting schedule.`,
    );
  if (!needsTiming && timing)
    throw new InvalidPresetError(
      `${key}: milestone grants have no vesting schedule; set timing to null.`,
    );

  if (needsMilestones) {
    if (!milestones?.length || milestones.length > MAX_PRESET_MILESTONES)
      throw new InvalidPresetError(
        `${key}: this strategy requires between 1 and ${MAX_PRESET_MILESTONES} milestones.`,
      );
    const total = milestones.reduce(
      (sum, milestone) => sum + milestone.percentOfAllocation,
      0,
    );
    if (total !== 100)
      throw new InvalidPresetError(
        `${key}: milestone percentages must add up to 100, got ${total}.`,
      );
    if (milestones.some((milestone) => !milestone.title.trim()))
      throw new InvalidPresetError(`${key}: every milestone needs a title.`);
    // Percentages become BigInt during the split, so a fraction would throw there.
    if (
      milestones.some(
        (milestone) =>
          !Number.isInteger(milestone.percentOfAllocation) ||
          milestone.percentOfAllocation <= 0,
      )
    )
      throw new InvalidPresetError(
        `${key}: milestone percentages must be positive whole numbers.`,
      );
    if (!reviewerRequired)
      throw new InvalidPresetError(
        `${key}: milestone approval requires a reviewer.`,
      );
  } else {
    if (milestones)
      throw new InvalidPresetError(
        `${key}: time vesting has no milestones; set milestones to null.`,
      );
    if (reviewerRequired)
      throw new InvalidPresetError(
        `${key}: time vesting grants do not use a reviewer.`,
      );
  }

  if (timing) {
    // The wizard's unit <select> is controlled: an unlisted value renders blank.
    if (!SCHEDULE_UNITS.includes(timing.unit))
      throw new InvalidPresetError(
        `${key}: unit must be one of ${SCHEDULE_UNITS.join(", ")} seconds.`,
      );
    if (!/^\d+$/.test(timing.duration) || timing.duration === "0")
      throw new InvalidPresetError(
        `${key}: duration must be a positive whole number.`,
      );
    if (!/^\d+$/.test(timing.cliff))
      throw new InvalidPresetError(
        `${key}: cliff must be a nonnegative whole number.`,
      );
    if (BigInt(timing.cliff) > BigInt(timing.duration))
      throw new InvalidPresetError(
        `${key}: cliff cannot be longer than the total duration.`,
      );
  }
}

/**
 * Catalog-level rules a single preset cannot check on its own. Runs over any
 * candidate list, including one an agent generated, before it is trusted.
 */
export function assertValidCatalog(presets: readonly GrantPreset[]): void {
  if (!presets.length)
    throw new InvalidPresetError("The preset catalog cannot be empty.");
  const seen = new Set<string>();
  for (const preset of presets) {
    assertValidPreset(preset);
    if (seen.has(preset.key))
      throw new InvalidPresetError(`Duplicate preset key: ${preset.key}.`);
    seen.add(preset.key);
  }
}

/**
 * Splits an allocation across percentages without losing or inventing base units.
 * The last milestone absorbs the rounding remainder, so the amounts always sum
 * back to exactly the allocation — the wizard rejects anything else.
 */
export function splitAllocationByPercent(
  allocationDecimal: string,
  decimals: number,
  percentages: number[],
): string[] {
  let total: bigint;
  try {
    total = parseUnits(allocationDecimal.trim(), decimals);
  } catch {
    return percentages.map(() => "");
  }
  if (total <= 0n) return percentages.map(() => "");

  const amounts: bigint[] = [];
  let assigned = 0n;
  percentages.forEach((percent, index) => {
    if (index === percentages.length - 1) {
      amounts.push(total - assigned);
      return;
    }
    const amount = (total * BigInt(percent)) / 100n;
    assigned += amount;
    amounts.push(amount);
  });
  return amounts.map((amount) => formatUnits(amount, decimals));
}

/**
 * Maps a preset onto wizard field values.
 *
 * A title or allocation the user already typed wins over the preset's
 * suggestion, so selecting a preset never silently discards their input.
 */
export function applyPresetToDraft(
  preset: GrantPreset,
  options: {
    allocationDecimal?: string;
    decimals?: number;
    title?: string;
  } = {},
): AppliedPresetDraft {
  assertValidPreset(preset);

  const allocation =
    options.allocationDecimal?.trim() || preset.allocationSuggestion;
  const decimals = options.decimals ?? FALLBACK_DECIMALS;

  const amounts = preset.milestones
    ? splitAllocationByPercent(
        allocation,
        decimals,
        preset.milestones.map((milestone) => milestone.percentOfAllocation),
      )
    : [];

  return {
    title: options.title?.trim() || preset.titleSuggestion,
    description: preset.descriptionSuggestion ?? "",
    allocation,
    strategy: preset.strategy,
    unit: preset.timing?.unit ?? "60",
    cliff: preset.timing?.cliff ?? "0",
    duration: preset.timing?.duration ?? "5",
    milestones:
      preset.milestones?.map((milestone, index) => ({
        title: milestone.title,
        amount: amounts[index] ?? "",
      })) ?? [],
    reviewerRequired: preset.reviewerRequired,
  };
}
