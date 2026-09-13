"use client";

import type { Address } from "viem";

import { DashboardOverview } from "@/components/dashboard-visuals";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

const issuer = "0x1111111111111111111111111111111111111111" as Address;
const beneficiary = "0x2222222222222222222222222222222222222222" as Address;
const reviewer = "0x3333333333333333333333333333333333333333" as Address;
const vaultA = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;
const vaultB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Address;

const fixture: DashboardAnalytics = {
  generatedAt: 1,
  grants: [
    {
      vaultAddress: vaultA,
      title: "Core implementation",
      strategy: 2,
      totalAllocation: 100_000n,
      claimedAmount: 42_000n,
      claimableAmount: 12_000n,
      issuer,
      beneficiary,
      reviewer,
      revoked: false,
      pendingMilestones: 1,
      organizationName: "Krellix Labs",
      lifecycle: "ACTIVE",
      roles: ["issuer", "reviewer"],
      claimedPercent: 42,
      lastActivityAt: null,
    },
    {
      vaultAddress: vaultB,
      title: "Launch & handoff",
      strategy: 1,
      totalAllocation: 80_000n,
      claimedAmount: 80_000n,
      claimableAmount: 0n,
      issuer,
      beneficiary,
      reviewer,
      revoked: false,
      pendingMilestones: 0,
      organizationName: "Krellix Labs",
      lifecycle: "COMPLETED",
      roles: ["beneficiary"],
      claimedPercent: 100,
      lastActivityAt: null,
    },
  ],
  events: [
    {
      id: "fixture-created",
      kind: "created",
      vaultAddress: vaultA,
      blockNumber: 33032417n,
      transactionHash: null,
      timestamp: null,
    },
    {
      id: "fixture-approved",
      kind: "approved",
      vaultAddress: vaultA,
      blockNumber: 33032418n,
      transactionHash: null,
      timestamp: null,
    },
    {
      id: "fixture-claimed",
      kind: "claimed",
      vaultAddress: vaultB,
      blockNumber: 33032419n,
      transactionHash: null,
      timestamp: null,
    },
  ],
  activity: [
    { key: "2026-04", label: "Apr", created: 2, approved: 1, claimed: 1, revoked: 0 },
    { key: "2026-05", label: "May", created: 1, approved: 2, claimed: 2, revoked: 0 },
    { key: "2026-06", label: "Jun", created: 2, approved: 1, claimed: 1, revoked: 0 },
    { key: "2026-07", label: "Jul", created: 1, approved: 1, claimed: 2, revoked: 0 },
    { key: "2026-08", label: "Aug", created: 2, approved: 2, claimed: 1, revoked: 0 },
    { key: "2026-09", label: "Sep", created: 1, approved: 2, claimed: 2, revoked: 0 },
  ],
  strategyDistribution: [
    { strategy: "TIME", count: 0 },
    { strategy: "MILESTONE", count: 1 },
    { strategy: "HYBRID", count: 1 },
  ],
  activeGrants: 1,
  pendingReviews: 1,
  claimableGrants: 1,
  partial: false,
};

export function VisualDashboardFixture() {
  return (
    <DashboardOverview
      analytics={{ data: fixture, status: "success", refetch: () => undefined }}
      organizationCount={3}
      connected
    />
  );
}
