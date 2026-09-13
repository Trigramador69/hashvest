import { describe, expect, it } from "vitest";

import {
  calculateUnlockedAmount,
  calculateVestedByTime,
  errorMessage,
} from "./grants";

describe("TGE / Initial Unlock vesting calculations (HAS-30)", () => {
  const START = 1_000_000n;
  const CLIFF = 90n * 86400n; // 90 days (3 months)
  const DURATION = 360n * 86400n; // 360 days (12 months)
  const TOTAL_ALLOCATION = 100_000n * 10n ** 18n;
  const TEN_PERCENT = 10_000n * 10n ** 18n;
  const NINETY_PERCENT = 90_000n * 10n ** 18n;

  describe("TIME strategy (calculateVestedByTime)", () => {
    it("satisfies the mandatory 10% TGE, 3mo cliff, 12mo linear vesting schedule", () => {
      // Before start: 0 unlocked
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START - 1n,
        }),
      ).toBe(0n);

      // At start: exactly 10% TGE unlocked
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START,
        }),
      ).toBe(TEN_PERCENT);

      // During cliff (e.g. 1 day, 30 days, 89 days): exactly 10% initial unlock, remaining locked
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START + 30n * 86400n,
        }),
      ).toBe(TEN_PERCENT);

      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START + CLIFF - 1n,
        }),
      ).toBe(TEN_PERCENT);

      // At cliff (90 days): 10,000 + (90,000 * 90 / 360) = 10,000 + 22,500 = 32,500
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START + CLIFF,
        }),
      ).toBe(32_500n * 10n ** 18n);

      // Midpoint (180 days): 10,000 + (90,000 * 180 / 360) = 10,000 + 45,000 = 55,000
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START + 180n * 86400n,
        }),
      ).toBe(55_000n * 10n ** 18n);

      // Full duration (360 days): 100,000 (100%)
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START + DURATION,
        }),
      ).toBe(TOTAL_ALLOCATION);

      // Beyond duration: stays capped at totalAllocation
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START + DURATION + 100n * 86400n,
        }),
      ).toBe(TOTAL_ALLOCATION);
    });

    it("matches legacy linear vesting when initialUnlock = 0n", () => {
      // During cliff: 0
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: 0n,
          timestamp: START + 30n * 86400n,
        }),
      ).toBe(0n);

      // At cliff: 100,000 * 90 / 360 = 25,000
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: 0n,
          timestamp: START + CLIFF,
        }),
      ).toBe(25_000n * 10n ** 18n);
    });

    it("handles boundary condition where initialUnlock equals totalAllocation", () => {
      // From start onwards, full allocation is unlocked
      expect(
        calculateVestedByTime({
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TOTAL_ALLOCATION,
          timestamp: START,
        }),
      ).toBe(TOTAL_ALLOCATION);
    });

    it("handles zero cliff with initial unlock", () => {
      // At start: 10,000
      expect(
        calculateVestedByTime({
          start: START,
          cliff: 0n,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START,
        }),
      ).toBe(TEN_PERCENT);

      // Midpoint: 55,000
      expect(
        calculateVestedByTime({
          start: START,
          cliff: 0n,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          timestamp: START + 180n * 86400n,
        }),
      ).toBe(55_000n * 10n ** 18n);
    });
  });

  describe("HYBRID strategy (calculateUnlockedAmount)", () => {
    it("releases initial unlock at start and dual-caps remaining allocation against milestones", () => {
      const remainingMilestones = NINETY_PERCENT; // 90,000

      // Before start
      expect(
        calculateUnlockedAmount({
          strategy: 2,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          milestoneUnlockedAmount: 0n,
          timestamp: START - 1n,
        }),
      ).toBe(0n);

      // At start, 0 milestones approved: initial unlock is available!
      expect(
        calculateUnlockedAmount({
          strategy: 2,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          milestoneUnlockedAmount: 0n,
          timestamp: START,
        }),
      ).toBe(TEN_PERCENT);

      // During cliff with all 90,000 milestones approved:
      // Time remaining is 0 (vestedByTime is 10,000 => vestingTimeUnlocked = 0).
      // Unlocked = 10,000 + min(0, 90,000) = 10,000 (cliff holds remaining allocation).
      expect(
        calculateUnlockedAmount({
          strategy: 2,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          milestoneUnlockedAmount: remainingMilestones,
          timestamp: START + 45n * 86400n,
        }),
      ).toBe(TEN_PERCENT);

      // At cliff (90 days): time remaining is 22,500
      // Case A: 0 milestones approved => 10,000 + min(22,500, 0) = 10,000
      expect(
        calculateUnlockedAmount({
          strategy: 2,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          milestoneUnlockedAmount: 0n,
          timestamp: START + CLIFF,
        }),
      ).toBe(TEN_PERCENT);

      // Case B: 15,000 milestones approved => 10,000 + min(22,500, 15,000) = 25,000
      expect(
        calculateUnlockedAmount({
          strategy: 2,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          milestoneUnlockedAmount: 15_000n * 10n ** 18n,
          timestamp: START + CLIFF,
        }),
      ).toBe(25_000n * 10n ** 18n);

      // Case C: 50,000 milestones approved => 10,000 + min(22,500, 50,000) = 32,500
      expect(
        calculateUnlockedAmount({
          strategy: 2,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          milestoneUnlockedAmount: 50_000n * 10n ** 18n,
          timestamp: START + CLIFF,
        }),
      ).toBe(32_500n * 10n ** 18n);

      // At duration (360 days): time remaining is 90,000
      // If milestones = 50,000: 10,000 + 50,000 = 60,000
      expect(
        calculateUnlockedAmount({
          strategy: 2,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          milestoneUnlockedAmount: 50_000n * 10n ** 18n,
          timestamp: START + DURATION,
        }),
      ).toBe(60_000n * 10n ** 18n);

      // If milestones = 90,000: 10,000 + 90,000 = 100,000 (full allocation)
      expect(
        calculateUnlockedAmount({
          strategy: 2,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: TEN_PERCENT,
          milestoneUnlockedAmount: NINETY_PERCENT,
          timestamp: START + DURATION,
        }),
      ).toBe(TOTAL_ALLOCATION);
    });
  });

  describe("MILESTONE strategy (calculateUnlockedAmount)", () => {
    it("returns approved milestones regardless of schedule parameters", () => {
      expect(
        calculateUnlockedAmount({
          strategy: 1,
          start: START,
          cliff: CLIFF,
          duration: DURATION,
          totalAllocation: TOTAL_ALLOCATION,
          initialUnlock: 0n,
          milestoneUnlockedAmount: 30_000n * 10n ** 18n,
          timestamp: START,
        }),
      ).toBe(30_000n * 10n ** 18n);
    });
  });
});

describe("errorMessage", () => {
  it("uses the caller's localized fallback for unknown errors", () => {
    expect(
      errorMessage(new Error("opaque backend detail"), {
        fallback: "La solicitud falló. Inténtalo de nuevo.",
      }),
    ).toBe("La solicitud falló. Inténtalo de nuevo.");
  });

  it("localizes the known wallet RPC diagnostic", () => {
    expect(
      errorMessage(new Error("eth_getBlockByNumber failed"), {
        rpcUnavailable: "El RPC de HSK Testnet no está disponible.",
      }),
    ).toBe("El RPC de HSK Testnet no está disponible.");
  });

  it("preserves translated errors thrown by the caller", () => {
    expect(
      errorMessage(new Error("Cambia primero a HSK Testnet."), {
        fallback: "La solicitud falló. Inténtalo de nuevo.",
        preserve: ["Cambia primero a HSK Testnet."],
      }),
    ).toBe("Cambia primero a HSK Testnet.");
  });
});
