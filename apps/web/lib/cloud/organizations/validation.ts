import { getAddress, isAddress, zeroAddress, type Address } from "viem";

export const ORGANIZATION_NAME_MAX_LENGTH = 120;
export const MEMBER_DISPLAY_NAME_MAX_LENGTH = 100;
export const ROLE_LABEL_MAX_LENGTH = 100;
export const GRANT_DESCRIPTION_MAX_LENGTH = 1000;
export const TEMPLATE_KEY_MAX_LENGTH = 80;

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
