/**
 * Organization-owned grant templates (HAS-12).
 *
 * A template is draft configuration metadata: it fills the shared grant wizard
 * with suggestions the user can edit before any wallet request, exactly like a
 * global preset. It holds no beneficiary, token, vault, funded allocation, or
 * any value a GrantVault computes, and its reviewer default is a member
 * reference, never an address.
 *
 * Validation and application go through the same `assertValidPreset` and
 * `applyPresetToDraft` the global presets use, so the two sources cannot drift.
 *
 * Layer-neutral: imports neither `@/lib/cloud` nor `@/lib/protocol`, so the
 * server can validate writes and the wizard can apply templates with one set
 * of rules. See docs/organization-templates.md.
 */

import {
  applyPresetToDraft,
  assertValidPreset,
  InvalidPresetError,
  type AppliedPresetDraft,
  type GrantDraftDefinition,
} from "./apply-preset";
import type { GrantPreset, GrantPresetMilestone } from "./presets";
import {
  formatOrganizationTemplateKey,
  type OrganizationTemplateKey,
} from "./template-key";

export const TEMPLATE_NAME_MAX_LENGTH = 80;
export const TEMPLATE_DESCRIPTION_MAX_LENGTH = 1000;
/** The wizard's milestone title input `maxLength`. */
export const TEMPLATE_MILESTONE_TITLE_MAX_LENGTH = 120;
/** A uint256 has at most 78 decimal digits. */
export const TEMPLATE_ALLOCATION_MAX_LENGTH = 78;

/** PostgreSQL `integer`, which stores schedule units. */
const MAX_SCHEDULE_UNITS = 2_147_483_647;

/** The wizard's schedule unit select, in seconds: minutes, hours, days. */
export const TEMPLATE_SCHEDULE_UNITS = [60, 3600, 86400] as const;
export type TemplateScheduleUnit = (typeof TEMPLATE_SCHEDULE_UNITS)[number];

export type OrganizationTemplateSchedule = {
  unitSeconds: TemplateScheduleUnit;
  cliffUnits: number;
  durationUnits: number;
};

/** Everything a template write sets. Identity and audit fields live on `OrganizationTemplateDefinition`. */
export type OrganizationTemplateContent = {
  name: string;
  description: string | null;
  /** Mirrors UnlockStrategy in GrantTypes.sol: 0 TIME, 1 MILESTONE, 2 HYBRID. */
  strategy: 0 | 1 | 2;
  /** Required for TIME and HYBRID; null for MILESTONE. */
  schedule: OrganizationTemplateSchedule | null;
  /** Percentages of the allocation, never amounts. Required for MILESTONE and HYBRID; null for TIME. */
  milestones: GrantPresetMilestone[] | null;
  /** An editable default amount. Never read from or reconciled with a vault. */
  allocationSuggestion: string | null;
  /** A member of the same organization to preselect as reviewer. Never an address, never permission. */
  defaultReviewerMemberId: string | null;
};

export type OrganizationTemplateDefinition = OrganizationTemplateContent & {
  id: string;
  version: number;
};

/** What applying a template gives the wizard. */
export type AppliedOrganizationTemplate = {
  /** The value to record in `organization_grants.template_key`. */
  templateKey: OrganizationTemplateKey;
  draft: AppliedPresetDraft;
  /** The member to preselect in the reviewer picker, if any. The user still confirms it. */
  defaultReviewerMemberId: string | null;
};

const SCHEDULE_UNIT_VALUES: Record<
  TemplateScheduleUnit,
  "60" | "3600" | "86400"
> = {
  60: "60",
  3600: "3600",
  86400: "86400",
};

function isTrimmedWithin(value: string, maxLength: number) {
  return (
    value === value.trim() && value.length >= 1 && value.length <= maxLength
  );
}

/** Maps template content onto the shape the preset rules and mapping share. */
function toDraftDefinition(
  content: OrganizationTemplateContent,
  key: string,
): GrantDraftDefinition {
  return {
    key,
    strategy: content.strategy,
    titleSuggestion: content.name,
    descriptionSuggestion: content.description ?? undefined,
    allocationSuggestion: content.allocationSuggestion ?? "",
    timing: content.schedule
      ? {
          unit: SCHEDULE_UNIT_VALUES[content.schedule.unitSeconds],
          cliff: String(content.schedule.cliffUnits),
          duration: String(content.schedule.durationUnits),
        }
      : null,
    milestones: content.milestones,
    // Derived, not stored: every milestone approval needs a reviewer, and TIME
    // vaults record the zero address as reviewer.
    reviewerRequired: content.strategy !== 0,
  };
}

/**
 * Rejects any template content the wizard or the protocol could not accept.
 *
 * Runs the global preset rules (strategy, schedule, milestone split, reviewer)
 * and adds what only templates have: stored-text limits, integer schedule
 * values, a positive allocation suggestion, and no reviewer default on TIME.
 */
export function assertValidOrganizationTemplate(
  content: OrganizationTemplateContent,
): void {
  if (!isTrimmedWithin(content.name, TEMPLATE_NAME_MAX_LENGTH))
    throw new InvalidPresetError(
      `Template name must be 1–${TEMPLATE_NAME_MAX_LENGTH} characters with no surrounding spaces.`,
    );
  if (
    content.description !== null &&
    !isTrimmedWithin(content.description, TEMPLATE_DESCRIPTION_MAX_LENGTH)
  )
    throw new InvalidPresetError(
      `Template description must be 1–${TEMPLATE_DESCRIPTION_MAX_LENGTH} characters with no surrounding spaces.`,
    );

  if (content.schedule) {
    const { unitSeconds, cliffUnits, durationUnits } = content.schedule;
    if (!TEMPLATE_SCHEDULE_UNITS.includes(unitSeconds))
      throw new InvalidPresetError(
        "Schedule unit must be minutes, hours, or days.",
      );
    if (
      !Number.isInteger(cliffUnits) ||
      !Number.isInteger(durationUnits) ||
      cliffUnits > MAX_SCHEDULE_UNITS ||
      durationUnits > MAX_SCHEDULE_UNITS
    )
      throw new InvalidPresetError(
        "Cliff and duration must be whole numbers within range.",
      );
  }

  if (
    content.milestones?.some(
      (milestone) =>
        milestone.title !== milestone.title.trim() ||
        milestone.title.length > TEMPLATE_MILESTONE_TITLE_MAX_LENGTH,
    )
  )
    throw new InvalidPresetError(
      `Milestone titles must be at most ${TEMPLATE_MILESTONE_TITLE_MAX_LENGTH} characters with no surrounding spaces.`,
    );

  if (content.allocationSuggestion !== null) {
    const value = content.allocationSuggestion;
    if (
      value.length > TEMPLATE_ALLOCATION_MAX_LENGTH ||
      !/^\d+(\.\d+)?$/.test(value) ||
      /^0+(\.0+)?$/.test(value)
    )
      throw new InvalidPresetError(
        "Allocation suggestion must be a positive decimal amount.",
      );
  }

  if (content.strategy === 0 && content.defaultReviewerMemberId !== null)
    throw new InvalidPresetError(
      "Time vesting templates cannot have a default reviewer.",
    );

  // Strategy, schedule presence and ranges, milestone count, split, and titles.
  assertValidPreset(toDraftDefinition(content, "template"));
}

/**
 * A template in the shape the wizard's preset rules take (HAS-13).
 *
 * The wizard applies it with `selectPreset`, the same call a global preset or
 * an AI draft goes through, so the field-ownership rules that decide what a
 * user keeps are shared rather than reimplemented. The preset's key is the
 * template key a grant records.
 *
 * Validates first, with the template-only rules too, so a stored template the
 * protocol could not accept never reaches the form. There is no display copy
 * beyond the template's own name and description: no tagline, audiences,
 * assumptions, or real-world schedule note is invented for user content.
 */
export function organizationTemplatePreset(
  template: OrganizationTemplateDefinition,
): GrantPreset & { key: OrganizationTemplateKey } {
  assertValidOrganizationTemplate(template);
  const key = formatOrganizationTemplateKey(template.id, template.version);
  const definition = toDraftDefinition(template, key);
  return {
    key,
    name: template.name,
    tagline: template.description ?? "",
    description: template.description ?? "",
    bestFor: [],
    strategy: definition.strategy,
    titleSuggestion: definition.titleSuggestion,
    descriptionSuggestion: definition.descriptionSuggestion,
    allocationSuggestion: definition.allocationSuggestion,
    timing: definition.timing
      ? { ...definition.timing, realWorldNote: "" }
      : null,
    milestones:
      template.milestones?.map((milestone) => ({ ...milestone })) ?? null,
    reviewerRequired: definition.reviewerRequired,
    assumptions: [],
  };
}

/**
 * Fills a wizard draft from a template.
 *
 * Pure: no network, no address, no signature. A title or allocation the user
 * already typed wins over the template's suggestion, and applying a template
 * to its own result returns an identical draft. A template that is invalid —
 * even one that reached storage somehow — is refused rather than turned into
 * a configuration the protocol would reject.
 */
export function applyOrganizationTemplateToDraft(
  template: OrganizationTemplateDefinition,
  options: {
    allocationDecimal?: string;
    decimals?: number;
    title?: string;
  } = {},
): AppliedOrganizationTemplate {
  assertValidOrganizationTemplate(template);
  const templateKey = formatOrganizationTemplateKey(
    template.id,
    template.version,
  );
  return {
    templateKey,
    draft: applyPresetToDraft(
      toDraftDefinition(template, templateKey),
      options,
    ),
    defaultReviewerMemberId: template.defaultReviewerMemberId,
  };
}
