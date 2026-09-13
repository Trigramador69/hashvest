import { describe, expect, it } from "vitest";
import { zeroAddress, type Address } from "viem";

import {
  CohortValidationError,
  filterPendingCohortItems,
  validateCohort,
} from "./validation";
import type {
  CohortExecutionItem,
  CohortMemberInput,
  CohortSharedConfig,
} from "./types";

const TOKEN = "0x1111111111111111111111111111111111111111" as Address;
const REVIEWER = "0x2222222222222222222222222222222222222222" as Address;
const ALICE = "0x3333333333333333333333333333333333333333" as Address;
const BOB = "0x4444444444444444444444444444444444444444" as Address;
const CHARLIE = "0x5555555555555555555555555555555555555555" as Address;

const defaultSharedConfig: CohortSharedConfig = {
  titlePrefix: "Q3 Core Contributors",
  token: TOKEN,
  strategy: 0, // TIME
  start: 1_000_000n,
  cliff: 0n,
  duration: 3600n,
  eligibilityProvider: zeroAddress,
  revocable: false,
  reviewer: zeroAddress,
};

describe("Cohort distribution validation (HAS-27)", () => {
  describe("Bounds checking", () => {
    it("rejects cohorts with fewer than 2 beneficiaries", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
      ];
      expect(() =>
        validateCohort({
          shared: defaultSharedConfig,
          members,
          decimals: 18,
        }),
      ).toThrow(CohortValidationError);
      expect(() =>
        validateCohort({
          shared: defaultSharedConfig,
          members,
          decimals: 18,
        }),
      ).toThrow(/at least 2 beneficiaries/i);
    });

    it("rejects cohorts with more than 10 beneficiaries", () => {
      const members: CohortMemberInput[] = Array.from(
        { length: 11 },
        (_, i) => ({
          id: String(i),
          beneficiary: `0x${(i + 1).toString().padStart(40, "0")}` as Address,
          allocation: "10",
        }),
      );
      expect(() =>
        validateCohort({
          shared: defaultSharedConfig,
          members,
          decimals: 18,
        }),
      ).toThrow(/maximum of 10 beneficiaries/i);
    });

    it("accepts a valid bounded cohort (e.g. 2 to 10 members)", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: BOB, allocation: "200" },
      ];
      const result = validateCohort({
        shared: defaultSharedConfig,
        members,
        decimals: 18,
      });
      expect(result.members.length).toBe(2);
      expect(result.totalAllocation).toBe(300n * 10n ** 18n);
    });
  });

  describe("Beneficiary validation & duplicates", () => {
    it("rejects duplicate beneficiaries (case-insensitive)", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: ALICE.toLowerCase(), allocation: "200" },
      ];
      expect(() =>
        validateCohort({
          shared: defaultSharedConfig,
          members,
          decimals: 18,
        }),
      ).toThrow(/duplicate beneficiary/i);
    });

    it("rejects invalid or zero addresses", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: zeroAddress, allocation: "200" },
      ];
      expect(() =>
        validateCohort({
          shared: defaultSharedConfig,
          members,
          decimals: 18,
        }),
      ).toThrow(/valid, non-zero beneficiary address/i);
    });
  });

  describe("Allocation & funding validation", () => {
    it("rejects zero or negative allocation", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: BOB, allocation: "0" },
      ];
      expect(() =>
        validateCohort({
          shared: defaultSharedConfig,
          members,
          decimals: 18,
        }),
      ).toThrow(/outside the supported range|greater than zero/i);
    });

    it("rejects when issuer balance is less than total cohort allocation", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: BOB, allocation: "200" },
      ];
      const totalRequired = 300n * 10n ** 18n;
      expect(() =>
        validateCohort({
          shared: defaultSharedConfig,
          members,
          decimals: 18,
          issuerBalance: totalRequired - 1n,
        }),
      ).toThrow(/insufficient token balance/i);
    });

    it("accepts when issuer balance is sufficient", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: BOB, allocation: "200" },
      ];
      const totalRequired = 300n * 10n ** 18n;
      const result = validateCohort({
        shared: defaultSharedConfig,
        members,
        decimals: 18,
        issuerBalance: totalRequired,
      });
      expect(result.totalAllocation).toBe(totalRequired);
    });
  });

  describe("Milestone and Hybrid partition", () => {
    it("partitions milestone percentages to match exact allocation", () => {
      const shared: CohortSharedConfig = {
        ...defaultSharedConfig,
        strategy: 1, // MILESTONE
        reviewer: REVIEWER,
        milestones: [
          { title: "Milestone 1", percentOfAllocation: 40 },
          { title: "Milestone 2", percentOfAllocation: 60 },
        ],
      };
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: BOB, allocation: "50" },
      ];
      const result = validateCohort({ shared, members, decimals: 18 });
      expect(result.members[0].milestones[0].amount).toBe(40n * 10n ** 18n);
      expect(result.members[0].milestones[1].amount).toBe(60n * 10n ** 18n);
      expect(result.members[1].milestones[0].amount).toBe(20n * 10n ** 18n);
      expect(result.members[1].milestones[1].amount).toBe(30n * 10n ** 18n);
    });

    it("applies initial unlock on TIME and reduces HYBRID milestone remainder", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: BOB, allocation: "50" },
      ];
      const timeResult = validateCohort({
        shared: { ...defaultSharedConfig, initialUnlockPercent: 10 },
        members,
        decimals: 18,
      });
      expect(timeResult.members[0].initialUnlock).toBe(10n * 10n ** 18n);
      expect(timeResult.members[1].initialUnlock).toBe(5n * 10n ** 18n);
      expect(timeResult.members[0].milestones).toEqual([]);

      const hybridResult = validateCohort({
        shared: {
          ...defaultSharedConfig,
          strategy: 2,
          reviewer: REVIEWER,
          initialUnlockPercent: 10,
          milestones: [
            { title: "Onboarding", percentOfAllocation: 40 },
            { title: "Delivery", percentOfAllocation: 60 },
          ],
        },
        members,
        decimals: 18,
      });
      expect(hybridResult.members[0].initialUnlock).toBe(10n * 10n ** 18n);
      expect(hybridResult.members[0].milestones[0].amount).toBe(
        36n * 10n ** 18n,
      );
      expect(hybridResult.members[0].milestones[1].amount).toBe(
        54n * 10n ** 18n,
      );
    });

    it("rejects initial unlock on pure MILESTONE and a 100% HYBRID unlock", () => {
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: BOB, allocation: "50" },
      ];
      expect(() =>
        validateCohort({
          shared: {
            ...defaultSharedConfig,
            strategy: 1,
            reviewer: REVIEWER,
            initialUnlockPercent: 10,
            milestones: [{ title: "Delivery", percentOfAllocation: 100 }],
          },
          members,
          decimals: 18,
        }),
      ).toThrow(/cannot have an initial unlock/i);
      expect(() =>
        validateCohort({
          shared: {
            ...defaultSharedConfig,
            strategy: 2,
            reviewer: REVIEWER,
            initialUnlockPercent: 100,
            milestones: [{ title: "Delivery", percentOfAllocation: 100 }],
          },
          members,
          decimals: 18,
        }),
      ).toThrow(/cannot equal the entire allocation/i);
    });

    it("rejects milestone percentages that do not sum to 100", () => {
      const shared: CohortSharedConfig = {
        ...defaultSharedConfig,
        strategy: 1,
        reviewer: REVIEWER,
        milestones: [
          { title: "M1", percentOfAllocation: 40 },
          { title: "M2", percentOfAllocation: 50 },
        ],
      };
      const members: CohortMemberInput[] = [
        { id: "1", beneficiary: ALICE, allocation: "100" },
        { id: "2", beneficiary: BOB, allocation: "50" },
      ];
      expect(() => validateCohort({ shared, members, decimals: 18 })).toThrow(
        /must sum to 100%/i,
      );
    });
  });

  describe("Idempotency & Retry filter", () => {
    it("filters out already-confirmed cohort items so only pending or failed rows are retried", () => {
      const items: CohortExecutionItem[] = [
        {
          id: "1",
          beneficiary: ALICE,
          allocation: 100n * 10n ** 18n,
          title: "Grant 1",
          status: "confirmed",
          vaultAddress: "0x7777777777777777777777777777777777777777",
          txHash: "0xaaaa",
        },
        {
          id: "2",
          beneficiary: BOB,
          allocation: 200n * 10n ** 18n,
          title: "Grant 2",
          status: "failed",
          error: "RPC timeout",
        },
        {
          id: "3",
          beneficiary: CHARLIE,
          allocation: 300n * 10n ** 18n,
          title: "Grant 3",
          status: "idle",
        },
      ];

      const retryable = filterPendingCohortItems(items);
      expect(retryable.length).toBe(2);
      expect(retryable.map((r) => r.id)).toEqual(["2", "3"]);
      expect(retryable.some((r) => r.id === "1")).toBe(false);
    });
  });
});
