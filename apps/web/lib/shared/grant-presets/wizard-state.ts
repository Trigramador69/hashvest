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
import { isOrganizationTemplateKey } from "./template-key";

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

/**
 * Whether the form still holds exactly what the applied preset wrote.
 *
 * `applied.fields` is the snapshot taken at apply time, so any inequality is an
 * edit the user made afterwards. This is deliberately *not* `userOwnedFields`:
 * that reports a value the user typed *before* a preset inherited it, which is
 * still faithfully described by the preset. Only a divergence from the snapshot
 * means the form no longer matches what was applied.
 *
 * The review step uses it to avoid attributing an edited configuration to the
 * AI draft or organization template it merely started from.
 */
export function isPresetEdited(
  current: Pick<AppliedPresetDraft, UserOwnedField>,
  applied: AppliedPreset | undefined,
): boolean {
  if (!applied) return false;
  if (!sameMilestones(current.milestones, applied.fields.milestones))
    return true;
  return (
    [
      "title",
      "description",
      "allocation",
      "strategy",
      "unit",
      "cliff",
      "duration",
    ] as const
  ).some((field) => current[field] !== applied.fields[field]);
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

/**
 * Resolves a catalog key. A generated draft and an organization template have
 * no entry and must be passed in.
 */
function resolveCatalogPreset(key: AppliedPresetKey): GrantPreset {
  if (key === GENERATED_PRESET_KEY || isOrganizationTemplateKey(key))
    throw new Error(
      "A generated draft or organization template must be supplied as options.preset; it has no catalog entry.",
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
     * Required for `GENERATED_PRESET_KEY` and for an organization template
     * (`organizationTemplatePreset`), which the catalog cannot resolve.
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

/**
 * The wizard's reviewer inputs. The organization-aware wizard picks a member
 * or, as a fallback, types an external address; the direct wizard only types.
 */
export type ReviewerSelection = {
  /** The member chosen in the organization picker, or "". */
  memberId: string;
  address: string;
  /** Typing an address rather than picking a member. Always true when direct. */
  external: boolean;
};

/**
 * Pre-fills the reviewer from an applied organization template (HAS-13).
 *
 * A template's default is a member reference, so it becomes a concrete choice
 * only here, against the organization's current members:
 *
 * - `organization` preselects the member in the picker.
 * - `direct` has no picker, so it fills in that member's current wallet as
 *   plain, editable text.
 *
 * It only ever fills an empty choice. A picked member, a typed address, or an
 * explicit switch to an external reviewer stays exactly as the user left it,
 * which is also why clearing or switching a template never touches the
 * reviewer. Nothing is filled for time vesting, which has no reviewer, or for
 * a member who has since left. The result is a suggestion: `prepare()` still
 * validates whatever reviewer is submitted.
 */
export function applyReviewerDefault({
  path,
  strategy,
  defaultReviewerMemberId,
  members,
  current,
}: {
  path: "organization" | "direct";
  /** The strategy the wizard holds once the template has been applied. */
  strategy: 0 | 1 | 2;
  defaultReviewerMemberId: string | null;
  /** The template's organization's members, or undefined while loading. */
  members: readonly { id: string; walletAddress: string }[] | undefined;
  current: ReviewerSelection;
}): ReviewerSelection {
  if (strategy === 0 || !defaultReviewerMemberId) return current;
  const member = members?.find((item) => item.id === defaultReviewerMemberId);
  if (!member) return current;
  if (path === "direct")
    return current.address.trim()
      ? current
      : { ...current, address: member.walletAddress };
  if (current.external || current.memberId) return current;
  return {
    memberId: member.id,
    address: member.walletAddress,
    external: false,
  };
}
