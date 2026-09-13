import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import {
  buildOrganizationReport,
  UPCOMING_UNLOCK_LIMIT,
} from "./organization-report";
import type { OrganizationGrantSnapshot } from "./organization-snapshot";

const NOW = new Date("2026-09-13T00:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

const REVIEWER = "0x00000000000000000000000000000000000000c1" as Address;
const BENEFICIARY = "0x00000000000000000000000000000000000000c2" as Address;
const ISSUER = "0x00000000000000000000000000000000000000c3" as Address;
const OTHER = "0x00000000000000000000000000000000000000ff" as Address;
const TOKEN_A = "0x00000000000000000000000000000000000000aa" as Address;
const TOKEN_B = "0x00000000000000000000000000000000000000bb" as Address;

function snapshot(
  overrides: Partial<OrganizationGrantSnapshot> = {},
): OrganizationGrantSnapshot {
  return {
    vaultAddress: "0x0000000000000000000000000000000000000001" as Address,
    title: "Grant",
    strategy: 0,
    token: TOKEN_A,
    symbol: "AAA",
    decimals: 18,
    totalAllocation: 1000n,
    claimedAmount: 0n,
    claimableAmount: 0n,
    unlockedAmount: 0n,
    initialUnlock: 0n,
    start: BigInt(NOW_SECONDS),
    cliff: 0n,
    duration: 0n,
    issuer: ISSUER,
    beneficiary: BENEFICIARY,
    reviewer: REVIEWER,
    revoked: false,
    revokedAt: 0n,
    milestones: [],
    blockNumber: 1n,
    readAt: NOW.getTime(),
    ...overrides,
  };
}

function report(
  snapshots: OrganizationGrantSnapshot[],
  options: { wallet?: string; unreadable?: string[] } = {},
) {
  return buildOrganizationReport({
    wallet: options.wallet,
    reads: {
      snapshots,
      unreadable: (options.unreadable ?? []).map((vaultAddress) => ({
        vaultAddress,
      })),
    },
    now: NOW,
  });
}

describe("buildOrganizationReport", () => {
  it("counts lifecycle from each vault state", () => {
    const result = report([
      snapshot({ vaultAddress: "0x01" as Address, claimedAmount: 0n }),
      snapshot({ vaultAddress: "0x02" as Address, claimedAmount: 1000n }),
      snapshot({ vaultAddress: "0x03" as Address, revoked: true }),
    ]);
    expect(result.lifecycle).toEqual({ active: 1, completed: 1, revoked: 1 });
  });

  it("groups allocations by token identity and never sums across tokens", () => {
    const result = report([
      snapshot({
        vaultAddress: "0x01" as Address,
        token: TOKEN_A,
        symbol: "AAA",
        totalAllocation: 100n,
        unlockedAmount: 40n,
        claimedAmount: 10n,
        claimableAmount: 30n,
      }),
      snapshot({
        vaultAddress: "0x02" as Address,
        token: TOKEN_A,
        symbol: "AAA",
        totalAllocation: 200n,
        unlockedAmount: 60n,
        claimedAmount: 20n,
        claimableAmount: 40n,
      }),
      snapshot({
        vaultAddress: "0x03" as Address,
        token: TOKEN_B,
        symbol: "BBB",
        decimals: 6,
        totalAllocation: 500n,
        unlockedAmount: 500n,
        claimedAmount: 500n,
      }),
    ]);
    expect(result.tokenGroups).toHaveLength(2);
    const [groupA, groupB] = result.tokenGroups;
    expect(groupA).toMatchObject({
      symbol: "AAA",
      decimals: 18,
      grantCount: 2,
      totalAllocation: 300n,
      unlockedAmount: 100n,
      unvestedAmount: 200n,
      claimedAmount: 30n,
      claimableAmount: 70n,
    });
    expect(groupB).toMatchObject({
      symbol: "BBB",
      decimals: 6,
      grantCount: 1,
      totalAllocation: 500n,
      unvestedAmount: 0n,
    });
  });

  it("names the vaults behind a group so it reconciles with GrantDetail", () => {
    const result = report([
      snapshot({ vaultAddress: "0x01" as Address }),
      snapshot({ vaultAddress: "0x02" as Address }),
    ]);
    expect(result.tokenGroups[0].vaultAddresses).toEqual(["0x01", "0x02"]);
  });

  it("clamps an unlocked amount that exceeds the allocation", () => {
    const result = report([
      snapshot({ totalAllocation: 100n, unlockedAmount: 150n }),
    ]);
    expect(result.tokenGroups[0].unlockedAmount).toBe(100n);
    expect(result.tokenGroups[0].unvestedAmount).toBe(0n);
  });

  it("reports an unreadable vault as partial rather than dropping it", () => {
    const result = report([snapshot()], { unreadable: ["0x09"] });
    expect(result.partial).toBe(true);
    expect(result.associatedGrants).toBe(2);
    expect(result.readableGrants).toBe(1);
    expect(result.unreadableVaults).toEqual(["0x09"]);
  });

  it("is not partial when every associated vault was read", () => {
    const result = report([snapshot()]);
    expect(result.partial).toBe(false);
    expect(result.unreadableVaults).toEqual([]);
  });

  it("scopes pending reviews and claimable grants to the connected wallet", () => {
    const snapshots = [
      snapshot({
        vaultAddress: "0x01" as Address,
        milestones: [{ title: "M1", amount: 10n, approved: false }],
        claimableAmount: 5n,
      }),
    ];
    expect(report(snapshots, { wallet: REVIEWER }).viewer).toEqual({
      pendingReviews: 1,
      claimableGrants: 0,
    });
    expect(report(snapshots, { wallet: BENEFICIARY }).viewer).toEqual({
      pendingReviews: 0,
      claimableGrants: 1,
    });
    // A member with no onchain role on the grant sees neither queue.
    expect(report(snapshots, { wallet: OTHER }).viewer).toEqual({
      pendingReviews: 0,
      claimableGrants: 0,
    });
  });

  it("keeps organization-wide totals independent of who is looking", () => {
    const snapshots = [snapshot({ totalAllocation: 100n })];
    expect(report(snapshots, { wallet: REVIEWER }).tokenGroups).toEqual(
      report(snapshots, { wallet: OTHER }).tokenGroups,
    );
  });

  it("lists future cliffs and vesting ends, earliest first", () => {
    const result = report([
      snapshot({
        vaultAddress: "0x01" as Address,
        title: "Time grant",
        start: BigInt(NOW_SECONDS),
        cliff: 200n,
        duration: 400n,
      }),
    ]);
    expect(result.upcomingUnlocks).toEqual([
      {
        vaultAddress: "0x01",
        title: "Time grant",
        kind: "cliff",
        at: NOW_SECONDS + 200,
        symbol: "AAA",
      },
      {
        vaultAddress: "0x01",
        title: "Time grant",
        kind: "vestingEnd",
        at: NOW_SECONDS + 400,
        symbol: "AAA",
      },
    ]);
  });

  it("omits dates that have already passed", () => {
    const result = report([
      snapshot({
        start: BigInt(NOW_SECONDS - 1000),
        cliff: 100n,
        duration: 0n,
      }),
    ]);
    expect(result.upcomingUnlocks).toEqual([]);
  });

  it("omits a milestone-only grant, which has no time condition", () => {
    const result = report([
      snapshot({ strategy: 1, cliff: 100n, duration: 400n }),
    ]);
    expect(result.upcomingUnlocks).toEqual([]);
  });

  it("omits a revoked grant, whose schedule stopped at revocation", () => {
    const result = report([
      snapshot({ revoked: true, cliff: 100n, duration: 400n }),
    ]);
    expect(result.upcomingUnlocks).toEqual([]);
  });

  it("bounds the upcoming list", () => {
    const result = report(
      Array.from({ length: UPCOMING_UNLOCK_LIMIT + 5 }, (_, index) =>
        snapshot({
          vaultAddress: `0x${index}` as Address,
          cliff: BigInt(index + 1),
          duration: BigInt(index + 100),
        }),
      ),
    );
    expect(result.upcomingUnlocks).toHaveLength(UPCOMING_UNLOCK_LIMIT);
  });

  it("reports the oldest read as the freshness bound", () => {
    const result = report([
      snapshot({ vaultAddress: "0x01" as Address, readAt: 2000 }),
      snapshot({ vaultAddress: "0x02" as Address, readAt: 1000 }),
    ]);
    expect(result.readAt).toBe(1000);
  });

  it("returns an empty report for an organization with no grants", () => {
    const result = report([]);
    expect(result.readAt).toBeNull();
    expect(result.associatedGrants).toBe(0);
    expect(result.tokenGroups).toEqual([]);
    expect(result.partial).toBe(false);
  });
});
