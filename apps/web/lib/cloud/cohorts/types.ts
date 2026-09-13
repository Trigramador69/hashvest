import type { Address } from "viem";

export const MIN_COHORT_SIZE = 2;
export const MAX_COHORT_SIZE = 10;

export type CohortMemberInput = {
  id: string;
  beneficiary: string;
  memberId?: string;
  allocation: string;
  titleSuffix?: string;
  external?: boolean;
};

export type CohortMilestoneTemplate = {
  title: string;
  percentOfAllocation: number;
};

export type CohortSharedConfig = {
  titlePrefix: string;
  token: Address;
  strategy: 0 | 1 | 2;
  start: bigint;
  cliff: bigint;
  duration: bigint;
  eligibilityProvider: Address;
  revocable: boolean;
  initialUnlockPercent?: number; // 0 to 100
  reviewer: Address;
  reviewerMemberId?: string;
  reviewerExternal?: boolean;
  milestones?: CohortMilestoneTemplate[];
};

export type ValidatedCohortMember = {
  id: string;
  beneficiary: Address;
  allocation: bigint;
  initialUnlock: bigint;
  title: string;
  milestones: { title: string; amount: bigint }[];
};

export type ValidatedCohort = {
  members: ValidatedCohortMember[];
  totalAllocation: bigint;
  sharedConfig: CohortSharedConfig;
};

export type CohortItemStatus =
  "idle" | "simulating" | "pending_signature" | "confirmed" | "failed";

export type CohortExecutionItem = {
  id: string;
  beneficiary: Address;
  allocation: bigint;
  title: string;
  status: CohortItemStatus;
  vaultAddress?: Address;
  txHash?: `0x${string}`;
  error?: string;
};
