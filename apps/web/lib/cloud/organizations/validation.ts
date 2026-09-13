import { getAddress, isAddress, zeroAddress, type Address } from "viem";

// Relative, not "@/": this module is also loaded by Vitest, which has no alias.
// Cloud importing shared is the permitted direction (docs/architecture.md).
import { InvalidPresetError } from "../../shared/grant-presets/apply-preset";
import {
  assertValidOrganizationTemplate,
  TEMPLATE_ALLOCATION_MAX_LENGTH,
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
  TEMPLATE_MILESTONE_TITLE_MAX_LENGTH,
  TEMPLATE_NAME_MAX_LENGTH,
  type OrganizationTemplateContent,
  type OrganizationTemplateSchedule,
} from "../../shared/grant-presets/organization-template";
import { TEMPLATE_KEY_MAX_LENGTH } from "../../shared/grant-presets/template-key";
import type { GrantPresetMilestone } from "../../shared/grant-presets/presets";

export { TEMPLATE_KEY_MAX_LENGTH };

export const ORGANIZATION_NAME_MAX_LENGTH = 120;
export const MEMBER_DISPLAY_NAME_MAX_LENGTH = 100;
export const ROLE_LABEL_MAX_LENGTH = 100;
export const GRANT_DESCRIPTION_MAX_LENGTH = 1000;
/** PostgreSQL `integer`, which stores the template version. */
const MAX_TEMPLATE_VERSION = 2_147_483_647;

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputValidationError";
  }
}

function stringValue(value: unknown, field: string) {
  if (typeof value !== "string")
    throw new InputValidationError(`${field} must be text.`);
  return value.trim();
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  const normalized = stringValue(value, field);
  if (!normalized) return null;
  if (normalized.length > maxLength)
    throw new InputValidationError(`${field} is too long.`);
  return normalized;
}

export function requiredText(value: unknown, field: string, maxLength: number) {
  const normalized = stringValue(value, field);
  if (!normalized) throw new InputValidationError(`${field} is required.`);
  if (normalized.length > maxLength)
    throw new InputValidationError(`${field} is too long.`);
  return normalized;
}

export function normalizeWalletAddress(
  value: unknown,
  field = "Wallet address",
): Address {
  const input = stringValue(value, field);
  if (!isAddress(input) || input.toLowerCase() === zeroAddress)
    throw new InputValidationError(
      `${field} must be a valid nonzero EVM address.`,
    );
  return getAddress(input).toLowerCase() as Address;
}

export function validateUuid(value: unknown, field = "Organization ID") {
  const input = stringValue(value, field);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input,
    )
  )
    throw new InputValidationError(`${field} is invalid.`);
  return input;
}

export function parseOrganizationInput(value: unknown) {
  if (!value || typeof value !== "object")
    throw new InputValidationError("Organization data is invalid.");
  const input = value as Record<string, unknown>;
  return {
    name: requiredText(
      input.name,
      "Organization name",
      ORGANIZATION_NAME_MAX_LENGTH,
    ),
    displayName: requiredText(
      input.displayName,
      "Your display name",
      MEMBER_DISPLAY_NAME_MAX_LENGTH,
    ),
    roleLabel: optionalText(
      input.roleLabel,
      "Role/title",
      ROLE_LABEL_MAX_LENGTH,
    ),
  };
}

export function parseMemberInput(value: unknown) {
  if (!value || typeof value !== "object")
    throw new InputValidationError("Member data is invalid.");
  const input = value as Record<string, unknown>;
  return {
    walletAddress: normalizeWalletAddress(input.walletAddress),
    displayName: requiredText(
      input.displayName,
      "Display name",
      MEMBER_DISPLAY_NAME_MAX_LENGTH,
    ),
    roleLabel: optionalText(
      input.roleLabel,
      "Role/title",
      ROLE_LABEL_MAX_LENGTH,
    ),
  };
}

export function parseMemberUpdateInput(value: unknown) {
  if (!value || typeof value !== "object")
    throw new InputValidationError("Member data is invalid.");
  const input = value as Record<string, unknown>;
  return {
    displayName: requiredText(
      input.displayName,
      "Display name",
      MEMBER_DISPLAY_NAME_MAX_LENGTH,
    ),
    roleLabel: optionalText(
      input.roleLabel,
      "Role/title",
      ROLE_LABEL_MAX_LENGTH,
    ),
  };
}

export function parseOrganizationGrantInput(value: unknown) {
  if (!value || typeof value !== "object")
    throw new InputValidationError("Grant association data is invalid.");
  const input = value as Record<string, unknown>;
  if (input.chainId !== 133)
    throw new InputValidationError(
      "Only HSK Testnet grants on chain 133 can be linked.",
    );
  return {
    chainId: 133 as const,
    vaultAddress: normalizeWalletAddress(
      input.vaultAddress,
      "GrantVault address",
    ),
    description: optionalText(
      input.description,
      "Grant description",
      GRANT_DESCRIPTION_MAX_LENGTH,
    ),
    templateKey: optionalText(
      input.templateKey,
      "Template key",
      TEMPLATE_KEY_MAX_LENGTH,
    ),
  };
}

function templateNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new InputValidationError(`${field} must be a number.`);
  return value;
}

function parseTemplateSchedule(
  value: unknown,
): OrganizationTemplateSchedule | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value))
    throw new InputValidationError("Schedule is invalid.");
  const input = value as Record<string, unknown>;
  return {
    unitSeconds: templateNumber(
      input.unitSeconds,
      "Schedule unit",
    ) as OrganizationTemplateSchedule["unitSeconds"],
    cliffUnits: templateNumber(input.cliffUnits, "Cliff"),
    durationUnits: templateNumber(input.durationUnits, "Duration"),
  };
}

function parseTemplateMilestones(
  value: unknown,
): GrantPresetMilestone[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value))
    throw new InputValidationError("Milestones must be a list.");
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new InputValidationError("Milestone is invalid.");
    const milestone = item as Record<string, unknown>;
    return {
      title: requiredText(
        milestone.title,
        "Milestone title",
        TEMPLATE_MILESTONE_TITLE_MAX_LENGTH,
      ),
      percentOfAllocation: templateNumber(
        milestone.percentOfAllocation,
        "Milestone percentage",
      ),
    };
  });
}

/**
 * Parses untrusted template input into content that is safe to store.
 *
 * Only the designed fields are read. Anything else in the payload — a
 * beneficiary, a token, a vault, an amount, an address, an author — is
 * dropped, never copied into storage (docs/organization-templates.md). The
 * author columns are set from the verified session, not from input.
 */
export function parseOrganizationTemplateInput(
  value: unknown,
): OrganizationTemplateContent {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputValidationError("Template data is invalid.");
  const input = value as Record<string, unknown>;

  const strategy = input.strategy;
  if (strategy !== 0 && strategy !== 1 && strategy !== 2)
    throw new InputValidationError(
      "Strategy must be time vesting, milestone, or hybrid.",
    );

  const reviewer = input.defaultReviewerMemberId;
  const content: OrganizationTemplateContent = {
    name: requiredText(input.name, "Template name", TEMPLATE_NAME_MAX_LENGTH),
    description: optionalText(
      input.description,
      "Template description",
      TEMPLATE_DESCRIPTION_MAX_LENGTH,
    ),
    strategy,
    schedule: parseTemplateSchedule(input.schedule),
    milestones: parseTemplateMilestones(input.milestones),
    allocationSuggestion: optionalText(
      input.allocationSuggestion,
      "Allocation suggestion",
      TEMPLATE_ALLOCATION_MAX_LENGTH,
    ),
    defaultReviewerMemberId:
      reviewer === undefined || reviewer === null || reviewer === ""
        ? null
        : validateUuid(reviewer, "Default reviewer"),
  };

  try {
    assertValidOrganizationTemplate(content);
  } catch (error) {
    if (error instanceof InvalidPresetError)
      throw new InputValidationError(
        // The shared rules prefix messages with an internal label.
        error.message.replace(/^template: /, ""),
      );
    throw error;
  }
  return content;
}

/**
 * The body of a template update: the new content and the version it was based
 * on, so a stale editor gets a conflict instead of overwriting a newer revision.
 */
export function parseOrganizationTemplateUpdateInput(value: unknown): {
  content: OrganizationTemplateContent;
  expectedVersion: number;
} {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputValidationError("Template data is invalid.");
  const input = value as Record<string, unknown>;
  return {
    content: parseOrganizationTemplateInput(input.template),
    expectedVersion: parseTemplateVersion(input.expectedVersion),
  };
}

/** The version an update was based on, for optimistic concurrency. */
export function parseTemplateVersion(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TEMPLATE_VERSION
  )
    throw new InputValidationError("Template version is invalid.");
  return value;
}
