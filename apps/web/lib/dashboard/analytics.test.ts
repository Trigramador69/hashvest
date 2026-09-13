import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import {
  aggregateDashboardAnalytics,
  formatStrategy,
  rolesForWallet,
  strategyLabel,
  type DashboardChainEvent,
  type DashboardGrantSnapshot,
} from "./analytics";

const issuer = "0x1111111111111111111111111111111111111111" as Address;
const beneficiary = "0x2222222222222222222222222222222222222222" as Address;
const reviewer = "0x3333333333333333333333333333333333333333" as Address;
const vault = "0x4444444444444444444444444444444444444444" as Address;

function snapshot(
  overrides: Partial<DashboardGrantSnapshot> = {},
): DashboardGrantSnapshot {
  return {
    vaultAddress: vault,
    title: "Customer churn",
    strategy: 2,
    totalAllocation: 1000n,
    claimedAmount: 250n,
    claimableAmount: 100n,
    issuer,
    beneficiary,
    reviewer,
    revoked: false,
    pendingMilestones: 1,
    ...overrides,
  };
}

function event(overrides: Partial<DashboardChainEvent>): DashboardChainEvent {
  return {
    id: "event-1",
    kind: "created",
    vaultAddress: vault,
    blockNumber: 100n,
    transactionHash: null,
    timestamp: Date.UTC(2026, 8, 12) / 1000,
    ...overrides,
  };
}

describe("dashboard analytics", () => {
  it("maps strategy labels and preserves the official order", () => {
    expect(strategyLabel(0)).toBe("TIME");
    expect(strategyLabel(1)).toBe("MILESTONE");
    expect(strategyLabel(2)).toBe("HYBRID");
    expect(formatStrategy("HYBRID")).toBe("Hybrid");
  });

  it("derives all roles without granting a zero reviewer role", () => {
    expect(rolesForWallet(issuer, snapshot())).toEqual(["issuer"]);
    expect(rolesForWallet(beneficiary, snapshot())).toEqual(["beneficiary"]);
    expect(rolesForWallet(reviewer, snapshot())).toEqual(["reviewer"]);
    expect(
      rolesForWallet(
        issuer,
        snapshot({ reviewer: "0x0000000000000000000000000000000000000000" }),
      ),
    ).toEqual(["issuer"]);
  });

  it("aggregates live grant states and six-month event buckets", () => {
    const now = new Date(Date.UTC(2026, 8, 20));
    const result = aggregateDashboardAnalytics({
      wallet: reviewer,
      snapshots: [snapshot()],
      events: [
        event({ id: "created", kind: "created", blockNumber: 100n }),
        event({ id: "approved", kind: "approved", blockNumber: 101n }),
        event({ id: "claimed", kind: "claimed", blockNumber: 102n }),
      ],
      now,
    });
    expect(result.activeGrants).toBe(1);
    expect(result.pendingReviews).toBe(1);
    expect(result.claimableGrants).toBe(0);
    expect(result.strategyDistribution).toEqual([
      { strategy: "TIME", count: 0 },
      { strategy: "MILESTONE", count: 0 },
      { strategy: "HYBRID", count: 1 },
    ]);
    expect(result.activity).toHaveLength(6);
    expect(result.activity.at(-1)).toMatchObject({
      created: 1,
      approved: 1,
      claimed: 1,
    });
  });

  it("does not hide partial log failures or treat revoked grants as active", () => {
    const result = aggregateDashboardAnalytics({
      snapshots: [snapshot({ revoked: true, pendingMilestones: 0 })],
      events: [],
      partial: true,
    });
    expect(result.partial).toBe(true);
    expect(result.activeGrants).toBe(0);
    expect(result.grants[0]?.lifecycle).toBe("REVOKED");
  });
});
