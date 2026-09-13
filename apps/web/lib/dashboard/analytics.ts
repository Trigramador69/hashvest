import type { Address, Hex } from "viem";

import {
  deriveGrantLifecycle,
  type GrantLifecycle,
} from "../protocol/grant-state";

export type DashboardRole = "issuer" | "beneficiary" | "reviewer";
export type DashboardStrategy = "TIME" | "MILESTONE" | "HYBRID";

export type DashboardGrantSnapshot = {
  vaultAddress: Address;
  title: string;
  strategy: number;
  totalAllocation: bigint;
  claimedAmount: bigint;
  claimableAmount: bigint;
  issuer: Address;
  beneficiary: Address;
  reviewer: Address;
  revoked: boolean;
  pendingMilestones: number;
  organizationName?: string;
};

export type DashboardChainEvent = {
  id: string;
  kind: "created" | "approved" | "claimed" | "revoked";
  vaultAddress: Address;
  blockNumber: bigint;
  transactionHash: Hex | null;
  timestamp: number | null;
  amount?: bigint;
  title?: string;
  strategy?: number;
};

export type DashboardGrant = DashboardGrantSnapshot & {
  lifecycle: GrantLifecycle;
  roles: DashboardRole[];
  claimedPercent: number;
  lastActivityAt: number | null;
};

export type DashboardActivityBucket = {
  key: string;
  label: string;
  created: number;
  approved: number;
  claimed: number;
  revoked: number;
};

export type DashboardAnalytics = {
  generatedAt: number;
  grants: DashboardGrant[];
  events: DashboardChainEvent[];
  activity: DashboardActivityBucket[];
  strategyDistribution: Array<{ strategy: DashboardStrategy; count: number }>;
  activeGrants: number;
  pendingReviews: number;
  claimableGrants: number;
  partial: boolean;
};

export function strategyLabel(strategy: number): DashboardStrategy {
  if (strategy === 1) return "MILESTONE";
  if (strategy === 2) return "HYBRID";
  return "TIME";
}

export function formatStrategy(strategy: DashboardStrategy): string {
  return strategy.charAt(0) + strategy.slice(1).toLowerCase();
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

function activityBuckets(now: Date): DashboardActivityBucket[] {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
    );
    return {
      key: monthKey(date),
      label: monthLabel(date),
      created: 0,
      approved: 0,
      claimed: 0,
      revoked: 0,
    };
  });
}

function percent(claimed: bigint, total: bigint) {
  if (total <= 0n) return 0;
  return Number((claimed * 10000n) / total) / 100;
}

export function rolesForWallet(
  wallet: string | undefined,
  snapshot: DashboardGrantSnapshot,
): DashboardRole[] {
  if (!wallet) return [];
  const normalized = wallet.toLowerCase();
  const roles: DashboardRole[] = [];
  if (snapshot.issuer.toLowerCase() === normalized) roles.push("issuer");
  if (snapshot.beneficiary.toLowerCase() === normalized)
    roles.push("beneficiary");
  if (
    snapshot.reviewer !== "0x0000000000000000000000000000000000000000" &&
    snapshot.reviewer.toLowerCase() === normalized
  )
    roles.push("reviewer");
  return roles;
}

export function aggregateDashboardAnalytics({
  wallet,
  snapshots,
  events,
  partial = false,
  now = new Date(),
}: {
  wallet?: string;
  snapshots: DashboardGrantSnapshot[];
  events: DashboardChainEvent[];
  partial?: boolean;
  now?: Date;
}): DashboardAnalytics {
  const sortedEvents = [...events].sort((a, b) => {
    const blockDifference = Number(b.blockNumber - a.blockNumber);
    if (blockDifference !== 0) return blockDifference;
    return b.id.localeCompare(a.id);
  });
  const eventsByVault = new Map<string, DashboardChainEvent[]>();
  for (const event of sortedEvents) {
    const key = event.vaultAddress.toLowerCase();
    const current = eventsByVault.get(key) ?? [];
    current.push(event);
    eventsByVault.set(key, current);
  }
  const grants = snapshots.map((snapshot) => {
    const grantEvents =
      eventsByVault.get(snapshot.vaultAddress.toLowerCase()) ?? [];
    const lastActivityAt =
      grantEvents.find((event) => event.timestamp)?.timestamp ?? null;
    return {
      ...snapshot,
      lifecycle: deriveGrantLifecycle(snapshot),
      roles: rolesForWallet(wallet, snapshot),
      claimedPercent: percent(snapshot.claimedAmount, snapshot.totalAllocation),
      lastActivityAt,
    } satisfies DashboardGrant;
  });
  const buckets = activityBuckets(now);
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const event of sortedEvents) {
    if (!event.timestamp) continue;
    const bucket = bucketByKey.get(monthKey(new Date(event.timestamp * 1000)));
    if (!bucket) continue;
    if (event.kind === "created") bucket.created += 1;
    if (event.kind === "approved") bucket.approved += 1;
    if (event.kind === "claimed") bucket.claimed += 1;
    if (event.kind === "revoked") bucket.revoked += 1;
  }
  const strategyCounts = new Map<DashboardStrategy, number>();
  for (const grant of grants) {
    const strategy = strategyLabel(grant.strategy);
    strategyCounts.set(strategy, (strategyCounts.get(strategy) ?? 0) + 1);
  }
  const strategyDistribution = (["TIME", "MILESTONE", "HYBRID"] as const).map(
    (strategy) => ({ strategy, count: strategyCounts.get(strategy) ?? 0 }),
  );
  return {
    generatedAt: now.getTime(),
    grants,
    events: sortedEvents.slice(0, 20),
    activity: buckets,
    strategyDistribution,
    activeGrants: grants.filter((grant) => grant.lifecycle === "ACTIVE").length,
    pendingReviews: grants.filter(
      (grant) =>
        grant.roles.includes("reviewer") &&
        grant.pendingMilestones > 0 &&
        !grant.revoked,
    ).length,
    claimableGrants: grants.filter(
      (grant) =>
        grant.roles.includes("beneficiary") && grant.claimableAmount > 0n,
    ).length,
    partial,
  };
}
