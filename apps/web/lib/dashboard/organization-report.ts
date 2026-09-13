import { deriveGrantLifecycle } from "../protocol/grant-state";
import { resolveProtocolRoles } from "../protocol/roles";
import {
  cliffAt,
  tokenGroupKey,
  vestingEndsAt,
  type OrganizationGrantReads,
  type OrganizationGrantSnapshot,
} from "./organization-snapshot";

/** How many future unlock dates a report lists before it stops. */
export const UPCOMING_UNLOCK_LIMIT = 8;

/**
 * Allocations for one ERC20 contract.
 *
 * Amounts are only ever summed inside a group. HashVest has no price feed, so
 * there is deliberately no cross-token total, no USD conversion and no TVL:
 * two tokens with different decimals are two different reports.
 */
export type OrganizationReportTokenGroup = {
  token: string;
  symbol: string;
  decimals: number;
  grantCount: number;
  /** GrantVault.totalAllocation summed across this group's vaults. */
  totalAllocation: bigint;
  /** GrantVault.unlockedAmount — vested by time and/or approved milestones. */
  unlockedAmount: bigint;
  /** Allocation the vault has not unlocked yet. */
  unvestedAmount: bigint;
  /** GrantVault.claimedAmount — already withdrawn by the beneficiary. */
  claimedAmount: bigint;
  /** GrantVault.claimableAmount — unlocked and not yet claimed. */
  claimableAmount: bigint;
  /** The vaults behind every number above, so a reader can reconcile them
   *  one by one against GrantDetail. */
  vaultAddresses: string[];
};

export type OrganizationUpcomingUnlock = {
  vaultAddress: string;
  title: string;
  kind: "cliff" | "vestingEnd";
  /** Unix seconds, derived from GrantVault.start plus cliff or duration. */
  at: number;
  symbol: string;
};

export type OrganizationReport = {
  generatedAt: number;
  /** The oldest read behind this report, for the freshness label. */
  readAt: number | null;
  /** Vaults the organization is associated with, whether readable or not. */
  associatedGrants: number;
  /** Vaults whose HSK read succeeded. Every number below covers only these. */
  readableGrants: number;
  /** Vaults whose HSK read failed; their values are absent, not zero. */
  unreadableVaults: string[];
  partial: boolean;
  lifecycle: { active: number; completed: number; revoked: number };
  /**
   * Counts for the connected wallet's own onchain roles only. A member never
   * sees another member's review queue or claimable funds here.
   */
  viewer: { pendingReviews: number; claimableGrants: number };
  tokenGroups: OrganizationReportTokenGroup[];
  upcomingUnlocks: OrganizationUpcomingUnlock[];
};

function emptyGroup(
  snapshot: OrganizationGrantSnapshot,
): OrganizationReportTokenGroup {
  return {
    token: tokenGroupKey(snapshot),
    symbol: snapshot.symbol,
    decimals: snapshot.decimals,
    grantCount: 0,
    totalAllocation: 0n,
    unlockedAmount: 0n,
    unvestedAmount: 0n,
    claimedAmount: 0n,
    claimableAmount: 0n,
    vaultAddresses: [],
  };
}

function upcomingFor(
  snapshot: OrganizationGrantSnapshot,
  nowSeconds: number,
): OrganizationUpcomingUnlock[] {
  // A revoked vault's schedule stopped at revokedAt; nothing further unlocks.
  if (snapshot.revoked) return [];
  const dates: OrganizationUpcomingUnlock[] = [];
  const cliff = cliffAt(snapshot);
  if (cliff !== null && cliff > nowSeconds)
    dates.push({
      vaultAddress: snapshot.vaultAddress,
      title: snapshot.title,
      kind: "cliff",
      at: cliff,
      symbol: snapshot.symbol,
    });
  const end = vestingEndsAt(snapshot);
  if (end !== null && end > nowSeconds)
    dates.push({
      vaultAddress: snapshot.vaultAddress,
      title: snapshot.title,
      kind: "vestingEnd",
      at: end,
      symbol: snapshot.symbol,
    });
  return dates;
}

/**
 * Derive an organization's operational report from live GrantVault reads.
 *
 * The Cloud association supplies which vaults to look at; every value reported
 * is HSK's own. Nothing here is stored, so the report cannot drift away from
 * the chain, and reading the same vaults again reproduces the same numbers.
 */
export function buildOrganizationReport({
  wallet,
  reads,
  now = new Date(),
}: {
  wallet?: string;
  reads: OrganizationGrantReads;
  now?: Date;
}): OrganizationReport {
  const { snapshots, unreadable } = reads;
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const lifecycle = { active: 0, completed: 0, revoked: 0 };
  const groups = new Map<string, OrganizationReportTokenGroup>();
  const upcoming: OrganizationUpcomingUnlock[] = [];
  let pendingReviews = 0;
  let claimableGrants = 0;
  let oldestRead: number | null = null;

  for (const snapshot of snapshots) {
    const state = deriveGrantLifecycle({
      totalAllocation: snapshot.totalAllocation,
      claimedAmount: snapshot.claimedAmount,
      revoked: snapshot.revoked,
    });
    if (state === "ACTIVE") lifecycle.active += 1;
    if (state === "COMPLETED") lifecycle.completed += 1;
    if (state === "REVOKED") lifecycle.revoked += 1;

    const roles = resolveProtocolRoles(wallet, snapshot);
    if (
      roles.isReviewer &&
      !snapshot.revoked &&
      snapshot.milestones.some((milestone) => !milestone.approved)
    )
      pendingReviews += 1;
    if (roles.isBeneficiary && snapshot.claimableAmount > 0n)
      claimableGrants += 1;

    const key = tokenGroupKey(snapshot);
    const group = groups.get(key) ?? emptyGroup(snapshot);
    const unlocked =
      snapshot.unlockedAmount > snapshot.totalAllocation
        ? snapshot.totalAllocation
        : snapshot.unlockedAmount;
    group.grantCount += 1;
    group.totalAllocation += snapshot.totalAllocation;
    group.unlockedAmount += unlocked;
    group.unvestedAmount += snapshot.totalAllocation - unlocked;
    group.claimedAmount += snapshot.claimedAmount;
    group.claimableAmount += snapshot.claimableAmount;
    group.vaultAddresses.push(snapshot.vaultAddress);
    groups.set(key, group);

    upcoming.push(...upcomingFor(snapshot, nowSeconds));
    oldestRead =
      oldestRead === null || snapshot.readAt < oldestRead
        ? snapshot.readAt
        : oldestRead;
  }

  return {
    generatedAt: now.getTime(),
    readAt: oldestRead,
    associatedGrants: snapshots.length + unreadable.length,
    readableGrants: snapshots.length,
    unreadableVaults: unreadable.map((failure) => failure.vaultAddress),
    partial: unreadable.length > 0,
    lifecycle,
    viewer: { pendingReviews, claimableGrants },
    tokenGroups: [...groups.values()].sort((left, right) =>
      left.symbol === right.symbol
        ? left.token.localeCompare(right.token)
        : left.symbol.localeCompare(right.symbol),
    ),
    upcomingUnlocks: upcoming
      .sort((left, right) =>
        left.at === right.at
          ? left.vaultAddress.localeCompare(right.vaultAddress)
          : left.at - right.at,
      )
      .slice(0, UPCOMING_UNLOCK_LIMIT),
  };
}
