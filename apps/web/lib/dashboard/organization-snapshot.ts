import type { Address } from "viem";

/**
 * One organization grant as HSK reported it at a single block.
 *
 * This is a read, never a record. Nothing here is persisted to Supabase and
 * nothing here is authority: the GrantVault remains the only source of value
 * and permission (docs/architecture.md). The organization association supplies
 * the discovery set; every field below comes from the chain.
 */
export type OrganizationGrantSnapshot = {
  vaultAddress: Address;
  title: string;
  strategy: number;
  /** Token identity. Amounts are only ever compared within one token. */
  token: Address;
  symbol: string;
  decimals: number;
  totalAllocation: bigint;
  claimedAmount: bigint;
  claimableAmount: bigint;
  unlockedAmount: bigint;
  initialUnlock: bigint;
  /** Unix seconds. `cliff` and `duration` are offsets from `start`. */
  start: bigint;
  cliff: bigint;
  duration: bigint;
  issuer: Address;
  beneficiary: Address;
  reviewer: Address;
  revoked: boolean;
  revokedAt: bigint;
  milestones: readonly { title: string; amount: bigint; approved: boolean }[];
  /** The block every field above was read at, so related metrics agree. */
  blockNumber: bigint;
  /** Local clock at read time, for the freshness label. */
  readAt: number;
};

/**
 * A vault the organization is associated with whose HSK read did not complete.
 *
 * Kept separately from the snapshots so a partial report stays visibly partial
 * instead of silently reporting smaller numbers.
 */
export type OrganizationGrantReadFailure = {
  vaultAddress: string;
};

export type OrganizationGrantReads = {
  snapshots: OrganizationGrantSnapshot[];
  unreadable: OrganizationGrantReadFailure[];
};

/** Milestone-only grants have no time condition; see GrantVault.vestedByTime. */
export function hasTimeCondition(strategy: number): boolean {
  return strategy !== 1;
}

/** Unix seconds at which the cliff releases the vesting allocation, if any. */
export function cliffAt(
  snapshot: Pick<OrganizationGrantSnapshot, "strategy" | "start" | "cliff">,
): number | null {
  if (!hasTimeCondition(snapshot.strategy) || snapshot.cliff === 0n)
    return null;
  return Number(snapshot.start + snapshot.cliff);
}

/** Unix seconds at which time vesting completes, if the grant has a schedule. */
export function vestingEndsAt(
  snapshot: Pick<OrganizationGrantSnapshot, "strategy" | "start" | "duration">,
): number | null {
  if (!hasTimeCondition(snapshot.strategy) || snapshot.duration === 0n)
    return null;
  return Number(snapshot.start + snapshot.duration);
}

/** The grouping identity for allocations: one ERC20 contract on one chain. */
export function tokenGroupKey(
  snapshot: Pick<OrganizationGrantSnapshot, "token">,
): string {
  return snapshot.token.toLowerCase();
}
