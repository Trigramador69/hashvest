import { isHex, type Address, type Hex } from "viem";

import {
  InputValidationError,
  normalizeWalletAddress,
  validateUuid,
} from "@/lib/cloud/organizations/validation";
import type { SponsoredActionType } from "@/lib/cloud/organizations/types";
import {
  MAX_ORGANIZATION_SPONSORED_ACTIONS,
  MAX_SPONSORSHIP_VAULTS,
  MAX_SPONSORED_ACTIONS_PER_WALLET_PER_DAY,
  SPONSORED_CLAIM_MAX_WINDOW_SECONDS,
} from "@/lib/shared/sponsored-claims";

type SponsoredActionCommon = {
  nonce: bigint;
  deadline: bigint;
  relayerAddress: Address;
  signature: Hex;
};

export type SponsoredActionInput = SponsoredActionCommon &
  (
    | { actionType: "claim"; amount: bigint; milestoneIndex: null }
    | { actionType: "review"; amount: null; milestoneIndex: number }
  );

export type SponsorshipPolicyInput = {
  enabled: boolean;
  allowedActions: SponsoredActionType[];
  allowedVaults: Address[];
  maxActions: number;
  maxActionsPerWalletPerDay: number;
  maxGasBudgetWei: bigint;
};

function decimalBigInt(value: unknown, field: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,77})$/.test(value))
    throw new InputValidationError(
      `${field} must be an unsigned decimal string.`,
    );
  const parsed = BigInt(value);
  if (parsed > 2n ** 256n - 1n)
    throw new InputValidationError(`${field} is outside the uint256 range.`);
  return parsed;
}

function parseCommon(input: Record<string, unknown>): SponsoredActionCommon {
  const nonce = decimalBigInt(input.nonce, "Nonce");
  const deadline = decimalBigInt(input.deadline, "Deadline");
  if (deadline === 0n)
    throw new InputValidationError("Deadline must be in the future.");
  const relayerAddress = normalizeWalletAddress(
    input.relayerAddress,
    "Relayer address",
  );
  if (
    typeof input.signature !== "string" ||
    !isHex(input.signature) ||
    input.signature.length !== 132
  )
    throw new InputValidationError(
      "Signature must be a 65-byte hex signature.",
    );
  return {
    nonce,
    deadline,
    relayerAddress,
    signature: input.signature as Hex,
  };
}

export function parseSponsoredActionInput(value: unknown): SponsoredActionInput {
  if (!value || typeof value !== "object")
    throw new InputValidationError("Sponsored action input must be an object.");
  const input = value as Record<string, unknown>;
  const common = parseCommon(input);
  if (input.actionType === "claim") {
    const amount = decimalBigInt(input.amount, "Amount");
    if (amount === 0n)
      throw new InputValidationError("Amount must be greater than zero.");
    return { ...common, actionType: "claim", amount, milestoneIndex: null };
  }
  if (input.actionType === "review") {
    if (
      typeof input.milestoneIndex !== "number" ||
      !Number.isSafeInteger(input.milestoneIndex) ||
      input.milestoneIndex < 0 ||
      input.milestoneIndex > 19
    )
      throw new InputValidationError(
        "Milestone index must be an integer from 0 to 19.",
      );
    return {
      ...common,
      actionType: "review",
      amount: null,
      milestoneIndex: input.milestoneIndex,
    };
  }
  throw new InputValidationError("Action type must be claim or review.");
}

export function assertSponsoredActionDeadline(
  deadline: bigint,
  now = BigInt(Math.floor(Date.now() / 1000)),
) {
  if (deadline <= now)
    throw new InputValidationError("The sponsored action signature has expired.");
  if (deadline > now + BigInt(SPONSORED_CLAIM_MAX_WINDOW_SECONDS))
    throw new InputValidationError(
      "The sponsored action deadline is too far in the future.",
    );
}

function integerInRange(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    throw new InputValidationError(
      `${field} must be an integer from ${minimum} to ${maximum}.`,
    );
  return value;
}

export function parseSponsorshipPolicyInput(
  value: unknown,
): SponsorshipPolicyInput {
  if (!value || typeof value !== "object")
    throw new InputValidationError("Sponsorship policy must be an object.");
  const input = value as Record<string, unknown>;
  if (typeof input.enabled !== "boolean")
    throw new InputValidationError("Sponsorship enabled must be boolean.");
  if (!Array.isArray(input.allowedActions) || input.allowedActions.length === 0)
    throw new InputValidationError("At least one sponsored action is required.");
  const allowedActions = Array.from(new Set(input.allowedActions));
  if (
    allowedActions.length > 2 ||
    allowedActions.some((action) => action !== "claim" && action !== "review")
  )
    throw new InputValidationError(
      "Allowed actions may contain only claim and review.",
    );
  if (
    !Array.isArray(input.allowedVaults) ||
    input.allowedVaults.length > MAX_SPONSORSHIP_VAULTS
  )
    throw new InputValidationError(
      `Allowed vaults must contain at most ${MAX_SPONSORSHIP_VAULTS} addresses.`,
    );
  const allowedVaults = Array.from(
    new Set(
      input.allowedVaults.map((vault) =>
        normalizeWalletAddress(vault, "Allowed vault address"),
      ),
    ),
  );
  if (input.enabled && allowedVaults.length === 0)
    throw new InputValidationError(
      "An enabled sponsorship policy requires at least one allowed vault.",
    );
  const maxActions = integerInRange(
    input.maxActions,
    "Maximum sponsored actions",
    0,
    MAX_ORGANIZATION_SPONSORED_ACTIONS,
  );
  const maxActionsPerWalletPerDay = integerInRange(
    input.maxActionsPerWalletPerDay,
    "Daily wallet limit",
    1,
    MAX_SPONSORED_ACTIONS_PER_WALLET_PER_DAY,
  );
  const maxGasBudgetWei = decimalBigInt(
    input.maxGasBudgetWei,
    "Maximum gas budget",
  );
  if (input.enabled && (maxActions === 0 || maxGasBudgetWei === 0n))
    throw new InputValidationError(
      "An enabled policy requires a non-zero action limit and gas budget.",
    );
  return {
    enabled: input.enabled,
    allowedActions: allowedActions as SponsoredActionType[],
    allowedVaults,
    maxActions,
    maxActionsPerWalletPerDay,
    maxGasBudgetWei,
  };
}

export function parseSponsoredActionRequestId(value: unknown) {
  return validateUuid(value, "Sponsored action request ID");
}

export function parseSponsoredActionNonce(value: unknown) {
  return decimalBigInt(value, "Nonce");
}
