import { isHex, type Address, type Hex } from "viem";

import {
  InputValidationError,
  normalizeWalletAddress,
  validateUuid,
} from "@/lib/cloud/organizations/validation";
import {
  MAX_ORGANIZATION_SPONSORED_CLAIMS,
  SPONSORED_CLAIM_MAX_WINDOW_SECONDS,
} from "@/lib/shared/sponsored-claims";

export type SponsoredClaimInput = {
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
  relayerAddress: Address;
  signature: Hex;
};

export type SponsorshipPolicyInput = {
  enabled: boolean;
  maxClaims: number;
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

export function parseSponsoredClaimInput(value: unknown): SponsoredClaimInput {
  if (!value || typeof value !== "object")
    throw new InputValidationError("Sponsored claim input must be an object.");
  const input = value as Record<string, unknown>;
  const amount = decimalBigInt(input.amount, "Amount");
  const nonce = decimalBigInt(input.nonce, "Nonce");
  const deadline = decimalBigInt(input.deadline, "Deadline");
  if (amount === 0n)
    throw new InputValidationError("Amount must be greater than zero.");
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
    amount,
    nonce,
    deadline,
    relayerAddress,
    signature: input.signature as Hex,
  };
}

export function assertSponsoredClaimDeadline(
  deadline: bigint,
  now = BigInt(Math.floor(Date.now() / 1000)),
) {
  if (deadline <= now)
    throw new InputValidationError(
      "The sponsored claim signature has expired.",
    );
  if (deadline > now + BigInt(SPONSORED_CLAIM_MAX_WINDOW_SECONDS))
    throw new InputValidationError(
      "The sponsored claim deadline is too far in the future.",
    );
}

export function parseSponsorshipPolicyInput(
  value: unknown,
): SponsorshipPolicyInput {
  if (!value || typeof value !== "object")
    throw new InputValidationError("Sponsorship policy must be an object.");
  const input = value as Record<string, unknown>;
  if (typeof input.enabled !== "boolean")
    throw new InputValidationError("Sponsorship enabled must be boolean.");
  if (
    typeof input.maxClaims !== "number" ||
    !Number.isSafeInteger(input.maxClaims) ||
    input.maxClaims < 0 ||
    input.maxClaims > MAX_ORGANIZATION_SPONSORED_CLAIMS
  )
    throw new InputValidationError(
      `Maximum sponsored claims must be an integer from 0 to ${MAX_ORGANIZATION_SPONSORED_CLAIMS}.`,
    );
  return { enabled: input.enabled, maxClaims: input.maxClaims };
}

export function parseSponsoredClaimRequestId(value: unknown) {
  return validateUuid(value, "Sponsored claim request ID");
}

export function parseSponsoredClaimNonce(value: unknown) {
  return decimalBigInt(value, "Nonce");
}
