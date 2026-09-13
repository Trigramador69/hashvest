import { getAddress } from "viem";

import {
  parseAllocation,
  shortAddress,
  validParty,
} from "../../protocol/grants";
import {
  MAX_COHORT_SIZE,
  MIN_COHORT_SIZE,
  type CohortExecutionItem,
  type CohortMemberInput,
  type CohortSharedConfig,
  type ValidatedCohort,
  type ValidatedCohortMember,
} from "./types";

export class CohortValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CohortValidationError";
  }
}

/**
 * Validates a cohort distribution proposal before any onchain transaction is signed or broadcast.
 */
export function validateCohort(params: {
  shared: CohortSharedConfig;
  members: CohortMemberInput[];
  decimals: number;
  issuerBalance?: bigint;
}): ValidatedCohort {
  const { shared, members, decimals, issuerBalance } = params;

  if (!shared.titlePrefix.trim()) {
    throw new CohortValidationError(
      "Cohort distribution requires a title prefix.",
    );
  }

  if (!validParty(shared.token)) {
    throw new CohortValidationError("Select a valid ERC20 token address.");
  }

  if (members.length < MIN_COHORT_SIZE) {
    throw new CohortValidationError(
      `A cohort must contain at least ${MIN_COHORT_SIZE} beneficiaries. For a single contributor, use single grant creation.`,
    );
  }

  if (members.length > MAX_COHORT_SIZE) {
    throw new CohortValidationError(
      `Cohort size is bounded to a maximum of ${MAX_COHORT_SIZE} beneficiaries per batch to guarantee predictable execution.`,
    );
  }

  if (shared.strategy !== 0 && !validParty(shared.reviewer)) {
    throw new CohortValidationError(
      "Milestone and Hybrid cohort grants require a valid reviewer address.",
    );
  }

  const seenAddresses = new Set<string>();
  const validatedMembers: ValidatedCohortMember[] = [];
  let totalAllocation = 0n;

  for (let i = 0; i < members.length; i++) {
    const row = members[i];
    const rowNum = i + 1;

    if (!validParty(row.beneficiary)) {
      throw new CohortValidationError(
        `Row ${rowNum}: Enter a valid, non-zero beneficiary address.`,
      );
    }

    const normalizedBeneficiary = getAddress(row.beneficiary);
    const lower = normalizedBeneficiary.toLowerCase();

    if (seenAddresses.has(lower)) {
      throw new CohortValidationError(
        `Duplicate beneficiary detected: ${normalizedBeneficiary} is included more than once in this cohort.`,
      );
    }
    seenAddresses.add(lower);

    let allocationBigInt: bigint;
    try {
      allocationBigInt = parseAllocation(row.allocation, decimals);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Invalid amount";
      throw new CohortValidationError(
        `Row ${rowNum} (${shortAddress(normalizedBeneficiary)}): ${msg}`,
      );
    }

    if (allocationBigInt <= 0n) {
      throw new CohortValidationError(
        `Row ${rowNum} (${shortAddress(normalizedBeneficiary)}): Allocation must be greater than zero.`,
      );
    }

    // Initial unlock calculation if specified
    const initialUnlockPercent = shared.initialUnlockPercent ?? 0;
    if (initialUnlockPercent < 0 || initialUnlockPercent > 100) {
      throw new CohortValidationError(
        "Initial unlock percent must be between 0 and 100.",
      );
    }
    const initialUnlockAmount =
      (allocationBigInt * BigInt(initialUnlockPercent)) / 100n;

    // Milestones partition
    const milestones: { title: string; amount: bigint }[] = [];
    if (shared.strategy !== 0) {
      if (!shared.milestones || shared.milestones.length === 0) {
        throw new CohortValidationError(
          "Milestone and Hybrid cohorts require at least one milestone template.",
        );
      }
      const sumPercent = shared.milestones.reduce(
        (sum, m) => sum + m.percentOfAllocation,
        0,
      );
      if (sumPercent !== 100) {
        throw new CohortValidationError(
          `Milestone percentages must sum to 100% (currently ${sumPercent}%).`,
        );
      }

      const remainingAllocation =
        shared.strategy === 2
          ? allocationBigInt - initialUnlockAmount
          : allocationBigInt;

      if (remainingAllocation <= 0n) {
        throw new CohortValidationError(
          `Row ${rowNum}: In Hybrid strategy, remaining allocation after initial unlock must be greater than zero.`,
        );
      }

      let milestoneSum = 0n;
      for (let mIdx = 0; mIdx < shared.milestones.length; mIdx++) {
        const template = shared.milestones[mIdx];
        const isLast = mIdx === shared.milestones.length - 1;
        const mAmount = isLast
          ? remainingAllocation - milestoneSum
          : (remainingAllocation * BigInt(template.percentOfAllocation)) / 100n;
        milestoneSum += mAmount;
        milestones.push({
          title: template.title.trim() || `Milestone ${mIdx + 1}`,
          amount: mAmount,
        });
      }
    }

    const titleSuffix = row.titleSuffix?.trim();
    const grantTitle = titleSuffix
      ? `${shared.titlePrefix.trim()} - ${titleSuffix}`
      : `${shared.titlePrefix.trim()} - ${shortAddress(normalizedBeneficiary)}`;

    validatedMembers.push({
      id: row.id,
      beneficiary: normalizedBeneficiary,
      allocation: allocationBigInt,
      initialUnlock: initialUnlockAmount,
      title: grantTitle,
      milestones,
    });

    totalAllocation += allocationBigInt;
  }

  if (issuerBalance !== undefined && issuerBalance < totalAllocation) {
    throw new CohortValidationError(
      "Insufficient token balance to fund the entire cohort. The full cohort allocation must be funded at creation.",
    );
  }

  return {
    members: validatedMembers,
    totalAllocation,
    sharedConfig: shared,
  };
}

/**
 * Filter items that require execution or retry, skipping any that are already confirmed onchain.
 * This guarantees strict idempotency on retry.
 */
export function filterPendingCohortItems(
  items: CohortExecutionItem[],
): CohortExecutionItem[] {
  return items.filter((item) => item.status !== "confirmed");
}
