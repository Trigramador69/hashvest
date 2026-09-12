export type GrantLifecycle = "ACTIVE" | "COMPLETED" | "REVOKED";

export type GrantFundingHealth = {
  coveredAmount: bigint;
  requiredVaultBalance: bigint;
  surplusAmount: bigint;
  percent: number;
  isFullyFunded: boolean;
};

export type GrantState = {
  lifecycle: GrantLifecycle;
  funding: GrantFundingHealth;
};

export function deriveGrantLifecycle(input: {
  totalAllocation: bigint;
  claimedAmount: bigint;
  revoked?: boolean;
}): GrantLifecycle {
  if (input.revoked) return "REVOKED";
  return input.claimedAmount >= input.totalAllocation ? "COMPLETED" : "ACTIVE";
}

/**
 * Derive presentation state from the GrantVault's authoritative values.
 * Claims reduce the vault balance, so funding is measured against the
 * unclaimed allocation rather than the original allocation alone.
 */
export function deriveGrantState(input: {
  totalAllocation: bigint;
  claimedAmount: bigint;
  vaultBalance: bigint;
  revoked?: boolean;
}): GrantState {
  const { totalAllocation, claimedAmount, vaultBalance, revoked } = input;
  const requiredVaultBalance =
    totalAllocation > claimedAmount ? totalAllocation - claimedAmount : 0n;
  const coveredAmount =
    totalAllocation === 0n
      ? 0n
      : claimedAmount + vaultBalance > totalAllocation
        ? totalAllocation
        : claimedAmount + vaultBalance;
  const surplusAmount =
    vaultBalance > requiredVaultBalance
      ? vaultBalance - requiredVaultBalance
      : 0n;
  const percent =
    totalAllocation === 0n
      ? 0
      : Number((coveredAmount * 10000n) / totalAllocation) / 100;

  return {
    lifecycle: deriveGrantLifecycle({
      totalAllocation,
      claimedAmount,
      revoked,
    }),
    funding: {
      coveredAmount,
      requiredVaultBalance,
      surplusAmount,
      percent,
      isFullyFunded:
        totalAllocation > 0n && vaultBalance >= requiredVaultBalance,
    },
  };
}
