import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from "viem";

export type RevocationState = {
  revocable: boolean;
  revoked: boolean;
  revokedAt: bigint;
  revocationEarnedAmount: bigint;
};

export type RevocationStateReader = {
  revocable: () => Promise<boolean>;
  revoked: () => Promise<boolean>;
  revokedAt: () => Promise<bigint>;
  revocationEarnedAmount: () => Promise<bigint>;
};

function isLegacyCapabilityError(error: unknown) {
  if (!(error instanceof ContractFunctionExecutionError)) return false;
  const cause = error.walk(
    (nested) =>
      nested instanceof ContractFunctionZeroDataError ||
      (nested instanceof ContractFunctionRevertedError &&
        !nested.data &&
        !nested.raw),
  );
  return Boolean(cause);
}

/**
 * Read the optional revocation surface without confusing old vaults with an
 * unavailable RPC. Old GrantVaults reject the capability probe, while a
 * deployed revocable implementation must return all four values successfully.
 */
export async function readRevocationState(
  reader: RevocationStateReader,
): Promise<RevocationState> {
  let revocable: boolean;
  try {
    revocable = await reader.revocable();
  } catch (error) {
    if (isLegacyCapabilityError(error)) {
      return {
        revocable: false,
        revoked: false,
        revokedAt: 0n,
        revocationEarnedAmount: 0n,
      };
    }
    throw error;
  }

  const [revoked, revokedAt, revocationEarnedAmount] = await Promise.all([
    reader.revoked(),
    reader.revokedAt(),
    reader.revocationEarnedAmount(),
  ]);
  return { revocable, revoked, revokedAt, revocationEarnedAmount };
}

export type RevocationPreview = {
  claimedAmount: bigint;
  earnedAmount: bigint;
  earnedUnclaimedAmount: bigint;
  recoveredAmount: bigint;
};

/**
 * Mirror the contract's accounting bounds for a safe confirmation preview.
 * The normal path is already invariant-preserving; the clamps keep malformed
 * or stale external data from causing a UI underflow.
 */
export function deriveRevocationPreview(input: {
  totalAllocation: bigint;
  claimedAmount: bigint;
  earnedAmount: bigint;
}): RevocationPreview {
  const claimedAmount =
    input.claimedAmount > input.totalAllocation
      ? input.totalAllocation
      : input.claimedAmount;
  const earnedAmount =
    input.earnedAmount < claimedAmount
      ? claimedAmount
      : input.earnedAmount > input.totalAllocation
        ? input.totalAllocation
        : input.earnedAmount;
  return {
    claimedAmount,
    earnedAmount,
    earnedUnclaimedAmount: earnedAmount - claimedAmount,
    recoveredAmount: input.totalAllocation - earnedAmount,
  };
}
