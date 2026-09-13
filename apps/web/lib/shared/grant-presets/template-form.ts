/**
 * The template editor's form model (HAS-13).
 *
 * A form holds strings, because that is what a user types; a template holds
 * typed content. This module is the only place that converts between the two
 * and decides what to tell the reader before a request is made. It lives here,
 * pure, rather than inside the manager component, so every rule is tested.
 *
 * It never replaces `assertValidOrganizationTemplate`: the same rules are
 * enforced again on the content it produces, and once more by the server and
 * the database. This layer exists to name a problem in the reader's language,
 * next to the field that caused it.
 *
 * Layer-neutral: imports neither `@/lib/cloud` nor `@/lib/protocol`.
 * See docs/organization-templates.md.
 */

import {
  MAX_PRESET_MILESTONES,
  type GrantDraftDefinition,
} from "./apply-preset";
import {
  TEMPLATE_ALLOCATION_MAX_LENGTH,
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
  TEMPLATE_MILESTONE_TITLE_MAX_LENGTH,
  TEMPLATE_NAME_MAX_LENGTH,
  TEMPLATE_SCHEDULE_UNITS,
  type OrganizationTemplateContent,
  type OrganizationTemplateDefinition,
  type TemplateScheduleUnit,
} from "./organization-template";

export type TemplateFormMilestone = { title: string; percent: string };

/** Every value the editor holds, as typed. */
export type TemplateForm = {
  name: string;
  description: string;
  strategy: GrantDraftDefinition["strategy"];
  /** Seconds, as the wizard's own schedule choice values. */
  unit: string;
  cliff: string;
  duration: string;
  milestones: TemplateFormMilestone[];
  allocationSuggestion: string;
  /** A member id, or "" for no default reviewer. */
  defaultReviewerMemberId: string;
};

/** A new template: time vesting, the wizard's own defaults, nothing assumed. */
export const BLANK_TEMPLATE_FORM: TemplateForm = {
  name: "",
  description: "",
  strategy: 0,
  unit: "60",
  cliff: "0",
  duration: "5",
  milestones: [{ title: "", percent: "100" }],
  allocationSuggestion: "",
  defaultReviewerMemberId: "",
};

/** Loads a stored template for editing. */
export function templateForm(
  template: OrganizationTemplateDefinition,
): TemplateForm {
  return {
    name: template.name,
    description: template.description ?? "",
    strategy: template.strategy,
    unit: String(template.schedule?.unitSeconds ?? BLANK_TEMPLATE_FORM.unit),
    cliff: String(template.schedule?.cliffUnits ?? BLANK_TEMPLATE_FORM.cliff),
    duration: String(
      template.schedule?.durationUnits ?? BLANK_TEMPLATE_FORM.duration,
    ),
    milestones: template.milestones?.length
      ? template.milestones.map((milestone) => ({
          title: milestone.title,
          percent: String(milestone.percentOfAllocation),
        }))
      : BLANK_TEMPLATE_FORM.milestones.map((milestone) => ({ ...milestone })),
    allocationSuggestion: template.allocationSuggestion ?? "",
    defaultReviewerMemberId: template.defaultReviewerMemberId ?? "",
  };
}

/** A problem to show next to a field, as a dictionary key and its values. */
export type TemplateFormIssue = {
  key:
    | "templates.error.name"
    | "templates.error.description"
    | "templates.error.duration"
    | "templates.error.cliff"
    | "templates.error.cliffTooLong"
    | "templates.error.milestoneCount"
    | "templates.error.milestoneTitle"
    | "templates.error.percent"
    | "templates.error.percentSum"
    | "templates.error.allocation";
  values?: Record<string, string | number>;
};

const WHOLE_NUMBER = /^\d+$/;
const DECIMAL_AMOUNT = /^\d+(\.\d+)?$/;

/** The sum shown live under the milestone rows. Non-numeric rows count as 0. */
export function milestonePercentTotal(
  milestones: readonly TemplateFormMilestone[],
): number {
  return milestones.reduce(
    (total, milestone) =>
      total +
      (WHOLE_NUMBER.test(milestone.percent.trim())
        ? Number(milestone.percent)
        : 0),
    0,
  );
}

/**
 * Everything wrong with the form right now, in field order.
 *
 * Mirrors the rules `assertValidOrganizationTemplate` enforces, so the editor
 * cannot offer to save something the server would reject — and so a rule
 * changed there is visibly missing here.
 */
export function templateFormIssues(form: TemplateForm): TemplateFormIssue[] {
  const issues: TemplateFormIssue[] = [];
  const name = form.name.trim();
  if (!name || name.length > TEMPLATE_NAME_MAX_LENGTH)
    issues.push({
      key: "templates.error.name",
      values: { max: TEMPLATE_NAME_MAX_LENGTH },
    });
  if (form.description.trim().length > TEMPLATE_DESCRIPTION_MAX_LENGTH)
    issues.push({
      key: "templates.error.description",
      values: { max: TEMPLATE_DESCRIPTION_MAX_LENGTH },
    });

  if (form.strategy !== 1) {
    const cliff = form.cliff.trim();
    const duration = form.duration.trim();
    if (!WHOLE_NUMBER.test(duration) || duration === "0")
      issues.push({ key: "templates.error.duration" });
    if (!WHOLE_NUMBER.test(cliff))
      issues.push({ key: "templates.error.cliff" });
    else if (WHOLE_NUMBER.test(duration) && BigInt(cliff) > BigInt(duration))
      issues.push({ key: "templates.error.cliffTooLong" });
  }

  if (form.strategy !== 0) {
    if (
      !form.milestones.length ||
      form.milestones.length > MAX_PRESET_MILESTONES
    )
      issues.push({
        key: "templates.error.milestoneCount",
        values: { max: MAX_PRESET_MILESTONES },
      });
    form.milestones.forEach((milestone, index) => {
      const title = milestone.title.trim();
      if (!title || title.length > TEMPLATE_MILESTONE_TITLE_MAX_LENGTH)
        issues.push({
          key: "templates.error.milestoneTitle",
          values: {
            index: index + 1,
            max: TEMPLATE_MILESTONE_TITLE_MAX_LENGTH,
          },
        });
      const percent = milestone.percent.trim();
      if (!WHOLE_NUMBER.test(percent) || Number(percent) <= 0)
        issues.push({
          key: "templates.error.percent",
          values: { index: index + 1 },
        });
    });
    const total = milestonePercentTotal(form.milestones);
    if (total !== 100)
      issues.push({ key: "templates.error.percentSum", values: { total } });
  }

  const allocation = form.allocationSuggestion.trim();
  if (
    allocation &&
    (allocation.length > TEMPLATE_ALLOCATION_MAX_LENGTH ||
      !DECIMAL_AMOUNT.test(allocation) ||
      /^0+(\.0+)?$/.test(allocation))
  )
    issues.push({ key: "templates.error.allocation" });

  return issues;
}

/**
 * The content a valid form describes.
 *
 * Only the fields the chosen strategy uses survive: a schedule the reader
 * filled in before switching to milestones is dropped rather than stored, and
 * time vesting never keeps a reviewer default — the wizard would have nowhere
 * to put it. Call `templateFormIssues` first; the content is validated again
 * by `assertValidOrganizationTemplate` before it is sent.
 */
export function templateFormToContent(
  form: TemplateForm,
): OrganizationTemplateContent {
  const description = form.description.trim();
  const allocation = form.allocationSuggestion.trim();
  return {
    name: form.name.trim(),
    description: description || null,
    strategy: form.strategy,
    schedule:
      form.strategy === 1
        ? null
        : {
            unitSeconds: scheduleUnit(form.unit),
            cliffUnits: Number(form.cliff.trim()),
            durationUnits: Number(form.duration.trim()),
          },
    milestones:
      form.strategy === 0
        ? null
        : form.milestones.map((milestone) => ({
            title: milestone.title.trim(),
            percentOfAllocation: Number(milestone.percent.trim()),
          })),
    allocationSuggestion: allocation || null,
    defaultReviewerMemberId:
      form.strategy === 0 ? null : form.defaultReviewerMemberId || null,
  };
}

function scheduleUnit(value: string): TemplateScheduleUnit {
  const seconds = Number(value);
  return (
    TEMPLATE_SCHEDULE_UNITS.find((unit) => unit === seconds) ??
    TEMPLATE_SCHEDULE_UNITS[0]
  );
}
