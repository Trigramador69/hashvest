import { zeroAddress } from "viem";

import { ApiError } from "@/lib/shared/api-error";
import type { SponsoredActionRequestRow } from "@/lib/cloud/organizations/types";
import { SPONSORED_ACTION_LEASE_TIMEOUT_SECONDS } from "@/lib/shared/sponsored-claims";

import type { SponsoredActionInput } from "./validation";

type LiveActionSnapshot = {
  beneficiary: string;
  reviewer: string;
  claimableAmount: bigint;
  claimNonce: bigint;
  reviewNonce: bigint;
  revoked: boolean;
  milestones: readonly { title: string; amount: bigint; approved: boolean }[];
};

export function sameSignedBinding(
  row: Pick<
    SponsoredActionRequestRow,
    | "action_type"
    | "actor_wallet"
    | "claim_amount"
    | "milestone_index"
    | "nonce"
    | "deadline"
    | "relayer_address"
    | "signature"
  >,
  input: SponsoredActionInput,
  actorWallet: string,
): boolean {
  return (
    row.action_type === input.actionType &&
    row.actor_wallet === actorWallet.toLowerCase() &&
    row.claim_amount ===
      (input.actionType === "claim" ? input.amount.toString() : null) &&
    row.milestone_index === input.milestoneIndex &&
    row.nonce === input.nonce.toString() &&
    row.deadline === input.deadline.toString() &&
    row.relayer_address === input.relayerAddress.toLowerCase() &&
    row.signature.toLowerCase() === input.signature.toLowerCase()
  );
}

export function classifyRelayerFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/insufficient funds|balance too low|insufficient balance/i.test(message))
    return {
      code: "relayer_insufficient_funds",
      message:
        "The organization relayer has insufficient HSK. Use the wallet-paid action or contact the organization owner.",
    };
  if (
    /timeout|timed out|fetch failed|network|429|cloudflare|1015/i.test(message)
  )
    return {
      code: "relayer_unavailable",
      message:
        "The organization relayer is temporarily unavailable. The same intent can be retried before expiry.",
    };
  return {
    code: "sponsored_action_rejected",
    message:
      "The sponsored action could not be submitted. Use the wallet-paid action.",
  };
}

export function isTerminalSponsoredRequest(
  row: Pick<SponsoredActionRequestRow, "status" | "tx_hash">,
) {
  return (
    row.status === "confirmed" ||
    row.status === "abandoned" ||
    (row.status === "failed" && Boolean(row.tx_hash))
  );
}

export function isFreshProcessingLease(
  row: Pick<SponsoredActionRequestRow, "status" | "tx_hash" | "processing_at">,
  now = Date.now(),
) {
  if (row.status !== "processing" || row.tx_hash) return false;
  if (!row.processing_at) return false;
  return (
    now - Date.parse(row.processing_at) <
    SPONSORED_ACTION_LEASE_TIMEOUT_SECONDS * 1000
  );
}

export function canAutoRecoverSponsoredRequest(
  row: Pick<SponsoredActionRequestRow, "status" | "tx_hash" | "processing_at">,
  options: { retryFailed: boolean },
  now = Date.now(),
) {
  if (row.status === "submitted") return true;
  if (isTerminalSponsoredRequest(row)) return false;
  if (row.status === "failed" && !row.tx_hash) return options.retryFailed;
  if (isFreshProcessingLease(row, now)) return false;
  return row.status === "requested" || row.status === "processing";
}

export function assertLiveAction(
  input: SponsoredActionInput,
  snapshot: LiveActionSnapshot,
  actorWallet: string,
) {
  const actor = actorWallet.toLowerCase();
  if (input.actionType === "claim") {
    if (snapshot.beneficiary.toLowerCase() !== actor)
      throw new ApiError(403, "Only the beneficiary can sponsor this claim.");
    if (input.nonce !== snapshot.claimNonce)
      throw new ApiError(409, "The sponsored claim nonce is stale.");
    if (input.amount > snapshot.claimableAmount)
      throw new ApiError(409, "The signed amount is no longer claimable.");
    return snapshot.beneficiary;
  }
  if (
    snapshot.reviewer === zeroAddress ||
    snapshot.reviewer.toLowerCase() !== actor
  )
    throw new ApiError(403, "Only the reviewer can sponsor this approval.");
  if (input.nonce !== snapshot.reviewNonce)
    throw new ApiError(409, "The sponsored review nonce is stale.");
  if (snapshot.revoked)
    throw new ApiError(409, "A revoked grant cannot approve milestones.");
  const milestone = snapshot.milestones[input.milestoneIndex];
  if (!milestone) throw new ApiError(409, "The milestone no longer exists.");
  if (milestone.approved)
    throw new ApiError(409, "The milestone is already approved.");
  return snapshot.reviewer;
}

/**
 * Refuses a policy edit that would drop a limit below what is already
 * committed, and says by how much (HAS-49).
 *
 * Lowering `maxActions` under the actions already reserved, or the gas budget
 * under the HSK already reserved and spent, would leave the workspace owing
 * more than it allows. The refusal carries the floor as structured detail
 * because the browser renders the sentence in the user's own language: an
 * English message cannot hand them the number they need.
 */
export function assertPolicyLimitsAboveCommitted(
  input: { maxActions: number; maxGasBudgetWei: bigint },
  committed: {
    usedActions: number;
    reservedGasWei: bigint;
    spentGasWei: bigint;
  },
): void {
  if (input.maxActions < committed.usedActions)
    throw new ApiError(
      409,
      "The action limit cannot be lower than actions already reserved.",
      { reason: "actionsBelowReserved", minActions: committed.usedActions },
    );
  const committedGasWei = committed.reservedGasWei + committed.spentGasWei;
  if (input.maxGasBudgetWei < committedGasWei)
    throw new ApiError(
      409,
      "The gas budget cannot be lower than reserved and spent HSK.",
      {
        reason: "gasBudgetBelowCommitted",
        minGasBudgetWei: committedGasWei.toString(),
      },
    );
}

export function policyErrorFromReserve(message: string) {
  const known: [string, number, string][] = [
    ["SPONSORSHIP_DISABLED", 409, "Sponsorship is disabled."],
    ["ACTION_NOT_ALLOWED", 403, "This action is not allowed by policy."],
    ["VAULT_NOT_ALLOWED", 403, "This vault is not allowed by policy."],
    ["ACTION_LIMIT_REACHED", 429, "The action limit has been reached."],
    [
      "DAILY_RATE_LIMIT_REACHED",
      429,
      "The daily wallet limit has been reached.",
    ],
    [
      "GAS_BUDGET_REACHED",
      429,
      "The organization gas budget has been reached.",
    ],
    [
      "ACTION_BINDING_MISMATCH",
      409,
      "A different request already uses this action nonce.",
    ],
  ];
  return known.find(([code]) => message.includes(code));
}
