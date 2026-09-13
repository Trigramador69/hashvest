import { describe, expect, it } from "vitest";

import { deriveGrantState } from "./grant-state";

const allocation = 100n;

describe("grant state derivation", () => {
  it("marks a newly funded vault active and fully funded", () => {
    expect(
      deriveGrantState({
        totalAllocation: allocation,
        claimedAmount: 0n,
        vaultBalance: allocation,
      }),
    ).toEqual({
      lifecycle: "ACTIVE",
      funding: {
        coveredAmount: allocation,
        requiredVaultBalance: allocation,
        surplusAmount: 0n,
        percent: 100,
        isFullyFunded: true,
      },
    });
  });

  it("keeps a partially claimed grant fully funded", () => {
    expect(
      deriveGrantState({
        totalAllocation: allocation,
        claimedAmount: 40n,
        vaultBalance: 60n,
      }),
    ).toEqual({
      lifecycle: "ACTIVE",
      funding: {
        coveredAmount: allocation,
        requiredVaultBalance: 60n,
        surplusAmount: 0n,
        percent: 100,
        isFullyFunded: true,
      },
    });
  });

  it("completes only after the full allocation has been claimed", () => {
    expect(
      deriveGrantState({
        totalAllocation: allocation,
        claimedAmount: allocation,
        vaultBalance: 0n,
      }),
    ).toEqual({
      lifecycle: "COMPLETED",
      funding: {
        coveredAmount: allocation,
        requiredVaultBalance: 0n,
        surplusAmount: 0n,
        percent: 100,
        isFullyFunded: true,
      },
    });
  });

  it("prioritizes the onchain revoked state over claimed completion", () => {
    expect(
      deriveGrantState({
        totalAllocation: allocation,
        claimedAmount: allocation,
        vaultBalance: 0n,
        revoked: true,
      }).lifecycle,
    ).toBe("REVOKED");
  });

  it("reports underfunding against the unclaimed allocation", () => {
    expect(
      deriveGrantState({
        totalAllocation: allocation,
        claimedAmount: 25n,
        vaultBalance: 50n,
      }),
    ).toEqual({
      lifecycle: "ACTIVE",
      funding: {
        coveredAmount: 75n,
        requiredVaultBalance: 75n,
        surplusAmount: 0n,
        percent: 75,
        isFullyFunded: false,
      },
    });
  });

  it("separates extra token transfers from the fixed allocation", () => {
    expect(
      deriveGrantState({
        totalAllocation: allocation,
        claimedAmount: 40n,
        vaultBalance: 70n,
      }),
    ).toEqual({
      lifecycle: "ACTIVE",
      funding: {
        coveredAmount: allocation,
        requiredVaultBalance: 60n,
        surplusAmount: 10n,
        percent: 100,
        isFullyFunded: true,
      },
    });
  });
});
