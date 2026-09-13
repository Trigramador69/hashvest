/**
 * Preset ↔ wizard field ownership (HAS-11).
 *
 * The wizard (apps/web/app/grants/new/page.tsx) owns plain field state; a
 * preset writes suggestions into it. The only hard question is which of those
 * values still belong to the preset and which now belong to the user, because
 * that is what decides whether switching or clearing a preset may overwrite a
 * field. Getting it wrong is invisible in types and easy to miss in review, so
 * the rule lives here as pure functions instead of inside a 1400-line client
 * component where no test can reach it.
 *
 * Like its siblings this module is layer-neutral: it imports neither
 * `@/lib/cloud` nor `@/lib/protocol`, and produces only the plain strings a
 * user could have typed. `prepare()` in the wizard remains the single source of
 * truth for what is submitted onchain.
 */

import {
  applyPresetToDraft,
  splitAllocationByPercent,
  FALLBACK_DECIMALS,
  type AppliedPresetDraft,
} from "./apply-preset";
import {
  GENERATED_PRESET_KEY,
  getGrantPreset,
  type AppliedPresetKey,
  type GrantPreset,
  type GrantPresetKey,
} from "./presets";

export type PresetMilestoneFields = AppliedPresetDraft["milestones"][number];

/** Every editable field a preset may suggest and the user may take ownership of. */
export type UserOwnedField =
  | "title"
  | "description"
  | "allocation"
  | "strategy"
  | "unit"
  | "cliff"
  | "duration"
  | "milestones";

/**
 * What the wizard shows when no preset is applied. These are the wizard's own
 * initial values, so clearing a preset returns the form to a blank state rather
 * than to some preset-flavoured approximation of one.
 */
export const BLANK_PRESET_FIELDS: AppliedPresetDraft = {
  title: "",
  description: "",
  allocation: "",
  strategy: 0,
  unit: "60",
  cliff: "0",
  duration: "5",
  milestones: [{ title: "", amount: "" }],
  reviewerRequired: false,
};

/**
 * A preset that has been written into the form.
 *
 * `fields` is the exact snapshot that was written, so a later inequality means
 * the user edited that field by hand. `userOwned` records the fields whose
 * value came from the user in the first place and which the preset therefore
 * merely inherited — without it, a title the user typed looks identical to one
 * a preset suggested, and clearing the preset would delete their work.
 */
export type AppliedPreset = {
  key: AppliedPresetKey;
  /**
   * The preset that was actually applied, locale-resolved.
   *
   * Kept rather than looked up from `key`, because an AI draft (HAS-18) has no
   * catalog entry to look up: it is built per request. Holding the source here
   * means `resyncMilestoneAmounts` works the same for a generated draft as for
   * a built-in preset instead of throwing on an unknown key.
   */
  preset: GrantPreset;
  fields: AppliedPresetDraft;
  userOwned: readonly UserOwnedField[];
};

/** Milestone rows are compared by value; identity changes on every keystroke. */
export function sameMilestones(
  items: readonly PresetMilestoneFields[],
  other: readonly PresetMilestoneFields[],
): boolean {
  return (
    items.length === other.length &&
    items.every(
      (item, index) =>
        item.title === other[index].title &&
        item.amount === other[index].amount,
    )
  );
}

/**
 * Whether `field` currently holds the user's own input rather than a preset's.
 *
 * True when they typed it with no preset applied, when a previous preset
 * already inherited it from them, or when they edited it after the preset
 * wrote it. An empty field is never user input.
 */
function isUserOwned(
  field: UserOwnedField,
  current: Pick<AppliedPresetDraft, UserOwnedField>,
  applied: AppliedPreset | undefined,
): boolean {
  if (field === "milestones") {
    if (!applied)
      return !sameMilestones(
        current.milestones,
        BLANK_PRESET_FIELDS.milestones,
      );
    if (applied.userOwned.includes(field)) return true;
    return !sameMilestones(current.milestones, applied.fields.milestones);
  }
  const value = current[field];
  const blank = BLANK_PRESET_FIELDS[field];
  if (!applied)
    return (
      value !== blank && (typeof value !== "string" || value.trim().length > 0)
    );
  if (applied.userOwned.includes(field)) return true;
  return value !== applied.fields[field];
}

function userOwnedFields(
  current: Pick<AppliedPresetDraft, UserOwnedField>,
  applied: AppliedPreset | undefined,
): UserOwnedField[] {
  return (
    [
      "title",
      "description",
      "allocation",
      "strategy",
      "unit",
      "cliff",
      "duration",
      "milestones",
    ] as const
  ).filter((field) => isUserOwned(field, current, applied));
}

/** Resolves a catalog key. A generated draft has no entry and must be passed in. */
function resolveCatalogPreset(key: AppliedPresetKey): GrantPreset {
  if (key === GENERATED_PRESET_KEY)
    throw new Error(
      "A generated draft must be supplied as options.preset; it has no catalog entry.",
    );
  return getGrantPreset(key as GrantPresetKey);
}

/**
 * Applies `key` over the current fields.
 *
 * Only genuinely user-authored values are carried into the new preset. A field
 * still holding the *previous* preset's suggestion is replaced by the new one —
 * otherwise switching from Builder Grant to Employee Vesting would keep the
 * title "Builder grant" and Builder's larger allocation.
 */
export function selectPreset(
  key: AppliedPresetKey,
  current: Pick<AppliedPresetDraft, UserOwnedField>,
  applied: AppliedPreset | undefined,
  options: {
    decimals?: number;
    applyDescription?: boolean;
    /**
     * A locale-resolved copy for user-facing title and milestone suggestions.
     * Required for `GENERATED_PRESET_KEY`, which the catalog cannot resolve.
     */
    preset?: GrantPreset;
  } = {},
): AppliedPreset {
  const source = options.preset ?? resolveCatalogPreset(key);
  const userOwned = userOwnedFields(current, applied);
  const draft = applyPresetToDraft(source, {
    title: userOwned.includes("title") ? current.title : "",
    allocationDecimal: userOwned.includes("allocation")
      ? current.allocation
      : "",
    decimals: options.decimals,
  });
  return {
    key,
    preset: source,
    fields: {
      ...draft,
      description: userOwned.includes("description")
        ? current.description
        : options.applyDescription === false
          ? current.description
          : draft.description,
      strategy: userOwned.includes("strategy")
        ? current.strategy
        : draft.strategy,
      unit: userOwned.includes("unit") ? current.unit : draft.unit,
      cliff: userOwned.includes("cliff") ? current.cliff : draft.cliff,
      duration: userOwned.includes("duration")
        ? current.duration
        : draft.duration,
      // The wizard always renders at least one milestone row for TIME presets.
      milestones: userOwned.includes("milestones")
        ? current.milestones
        : draft.milestones.length
          ? draft.milestones
          : BLANK_PRESET_FIELDS.milestones,
    },
    userOwned,
  };
}

/** Restores a field to its blank default only while the preset still owns it. */
function restore<Value>(
  currentValue: Value,
  appliedValue: Value,
  blankValue: Value,
): Value {
  return currentValue === appliedValue ? blankValue : currentValue;
}

/**
 * Clears a preset, returning the field values the wizard should keep.
 *
 * Anything the user typed or edited survives; only values still holding exactly
 * what the preset wrote go back to blank. Choosing "Custom / blank" is an undo
 * of the preset, never an undo of the user.
 */
export function clearPreset(
  current: AppliedPresetDraft,
  applied: AppliedPreset | undefined,
): AppliedPresetDraft {
  if (!applied) return current;
  const { fields } = applied;
  const blank = BLANK_PRESET_FIELDS;
  const ownedByUser = (field: UserOwnedField) =>
    applied.userOwned.includes(field);
  return {
    title: ownedByUser("title")
      ? current.title
      : restore(current.title, fields.title, blank.title),
    description: ownedByUser("description")
      ? current.description
      : restore(current.description, fields.description, blank.description),
    allocation: ownedByUser("allocation")
      ? current.allocation
      : restore(current.allocation, fields.allocation, blank.allocation),
    strategy: ownedByUser("strategy")
      ? current.strategy
      : restore(current.strategy, fields.strategy, blank.strategy),
    unit: ownedByUser("unit")
      ? current.unit
      : restore(current.unit, fields.unit, blank.unit),
    cliff: ownedByUser("cliff")
      ? current.cliff
      : restore(current.cliff, fields.cliff, blank.cliff),
    duration: ownedByUser("duration")
      ? current.duration
      : restore(current.duration, fields.duration, blank.duration),
    milestones: ownedByUser("milestones")
      ? current.milestones
      : sameMilestones(current.milestones, fields.milestones)
        ? blank.milestones
        : current.milestones,
    reviewerRequired: false,
  };
}

/**
 * Keeps an untouched preset milestone split in step with a changed allocation,
 * so the amounts still sum to exactly the total when `prepare()` checks them.
 *
 * Returns `undefined` when there is nothing to re-split — no preset, no
 * milestones, or a split the user has already edited and therefore owns. The
 * new allocation is always recorded as the user's own.
 */
export function resyncMilestoneAmounts(
  allocation: string,
  currentMilestones: readonly PresetMilestoneFields[],
  applied: AppliedPreset | undefined,
  decimals?: number,
): AppliedPreset | undefined {
  if (!applied) return undefined;
  const percentages = applied.preset.milestones?.map(
    (milestone) => milestone.percentOfAllocation,
  );
  if (!percentages?.length) return undefined;
  if (!sameMilestones(currentMilestones, applied.fields.milestones))
    return undefined;
  const amounts = splitAllocationByPercent(
    allocation,
    decimals ?? FALLBACK_DECIMALS,
    percentages,
  );
  return {
    ...applied,
    userOwned: applied.userOwned.includes("allocation")
      ? applied.userOwned
      : [...applied.userOwned, "allocation"],
    fields: {
      ...applied.fields,
      allocation,
      milestones: applied.fields.milestones.map((milestone, index) => ({
        title: milestone.title,
        amount: amounts[index] ?? "",
      })),
    },
  };
}
