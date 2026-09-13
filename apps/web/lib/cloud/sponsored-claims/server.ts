import "server-only";

import { recoverTypedDataAddress, type Address, type Hash } from "viem";

import {
  SPONSORED_ACTION_DOMAIN,
  SPONSORED_CLAIM_TYPES,
  SPONSORED_REVIEW_TYPES,
  sponsoredGrantVaultAbi,
} from "@hashvest/web3";

import { ApiError } from "@/lib/cloud/api-server";
import {
  requireOrganizationMember,
  requireOrganizationOwner,
} from "@/lib/cloud/organizations/server";
import type {
  SponsoredActionRequest,
  SponsoredActionRequestRow,
  SponsoredActionType,
  SponsorshipPolicy,
  SponsorshipPolicyRow,
} from "@/lib/cloud/organizations/types";
import { createSupabaseAdmin } from "@/lib/cloud/supabase-server";
import {
  readSponsoredActionSnapshot,
  readTransactionReceipt,
  type SponsoredActionSnapshot,
} from "@/lib/protocol/sponsored-claims-server";
import {
  assertLiveAction,
  assertPolicyLimitsAboveCommitted,
  canAutoRecoverSponsoredRequest,
  classifyRelayerFailure,
  isFreshProcessingLease,
  policyErrorFromReserve,
  sameSignedBinding,
} from "./policy";
import { getSponsoredRelayer, getSponsoredRelayerAddress } from "./relayer";
import {
  assertSponsoredActionDeadline,
  type SponsoredActionInput,
  type SponsorshipPolicyInput,
} from "./validation";

const CHAIN_ID = 133 as const;

export type SponsorshipPolicyResponse = SponsorshipPolicy & {
  relayerAddress: Address | null;
  relayerConfigured: boolean;
};

function databaseUnavailable(): ApiError {
  return new ApiError(503, "Workspace data is temporarily unavailable.");
}

function mapPolicy(row: SponsorshipPolicyRow): SponsorshipPolicy {
  const maxGas = BigInt(row.max_gas_budget_wei);
  const reservedGas = BigInt(row.reserved_gas_wei);
  const spentGas = BigInt(row.spent_gas_wei);
  return {
    organizationId: row.organization_id,
    enabled: row.enabled,
    allowedActions: row.allowed_actions,
    allowedVaults: row.allowed_vaults,
    maxActions: row.max_actions,
    usedActions: row.used_actions,
    remainingActions: Math.max(0, row.max_actions - row.used_actions),
    maxActionsPerWalletPerDay: row.max_actions_per_wallet_per_day,
    maxGasBudgetWei: row.max_gas_budget_wei,
    reservedGasWei: row.reserved_gas_wei,
    spentGasWei: row.spent_gas_wei,
    remainingGasWei: (maxGas - reservedGas - spentGas).toString(),
    updatedByWallet: row.updated_by_wallet,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRequest(row: SponsoredActionRequestRow): SponsoredActionRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    chainId: CHAIN_ID,
    vaultAddress: row.vault_address,
    actionType: row.action_type,
    actorWallet: row.actor_wallet,
    claimAmount: row.claim_amount,
    milestoneIndex: row.milestone_index,
    nonce: row.nonce,
    deadline: row.deadline,
    relayerAddress: row.relayer_address,
    gasLimit: row.gas_limit,
    gasPrice: row.gas_price,
    estimatedGasCostWei: row.estimated_gas_cost_wei,
    actualGasCostWei: row.actual_gas_cost_wei,
    gasUsed: row.gas_used,
    effectiveGasPrice: row.effective_gas_price,
    blockNumber: row.block_number,
    status: row.status,
    attempts: row.attempts,
    processingAt: row.processing_at,
    txHash: row.tx_hash,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function expireReservations(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
) {
  const { error } = await supabase.rpc("expire_sponsored_actions", {
    p_organization_id: organizationId,
  });
  if (error) throw databaseUnavailable();
}

async function ensurePolicy(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
): Promise<SponsorshipPolicyRow> {
  const { data, error } = await supabase
    .from("organization_sponsorship_policies")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from("organization_sponsorship_policies")
    .insert({
      organization_id: organizationId,
      enabled: false,
      allowed_actions: ["claim"],
      allowed_vaults: [],
      max_actions: 0,
      used_actions: 0,
      max_actions_per_wallet_per_day: 1,
      max_gas_budget_wei: "0",
      reserved_gas_wei: "0",
      spent_gas_wei: "0",
      updated_by_wallet: null,
    })
    .select("*")
    .maybeSingle();
  if (!createError && created) return created;
  if (createError?.code !== "23505") throw databaseUnavailable();

  const { data: concurrent, error: concurrentError } = await supabase
    .from("organization_sponsorship_policies")
    .select("*")
    .eq("organization_id", organizationId)
    .single();
  if (concurrentError || !concurrent) throw databaseUnavailable();
  return concurrent;
}

function relayerStatus() {
  let relayerAddress: Address | null = null;
  try {
    relayerAddress = getSponsoredRelayerAddress();
  } catch {
    // Policy remains readable so the UI can preserve wallet-paid fallbacks.
  }
  return {
    relayerAddress,
    relayerConfigured: relayerAddress !== null,
  };
}

export async function getOrganizationSponsorshipPolicy(
  organizationId: string,
): Promise<SponsorshipPolicyResponse> {
  const access = await requireOrganizationMember(organizationId);
  await expireReservations(access.supabase, organizationId);
  const policy = mapPolicy(await ensurePolicy(access.supabase, organizationId));
  return { ...policy, ...relayerStatus() };
}

async function assertAllowedVaultsAssociated(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
  allowedVaults: readonly Address[],
) {
  if (allowedVaults.length === 0) return;
  const { data, error } = await supabase
    .from("organization_grants")
    .select("vault_address")
    .eq("organization_id", organizationId)
    .eq("chain_id", CHAIN_ID);
  if (error) throw databaseUnavailable();
  const associated = new Set(
    (data ?? []).map((grant) => grant.vault_address.toLowerCase()),
  );
  if (allowedVaults.some((vault) => !associated.has(vault.toLowerCase())))
    throw new ApiError(
      409,
      "Every sponsored vault must be associated with this organization.",
    );
}

export async function updateOrganizationSponsorshipPolicy(
  organizationId: string,
  input: SponsorshipPolicyInput,
): Promise<SponsorshipPolicyResponse> {
  const access = await requireOrganizationOwner(organizationId);
  await expireReservations(access.supabase, organizationId);
  const existing = await ensurePolicy(access.supabase, organizationId);
  // The rule, and the floors it reports, live in policy.ts where a test can
  // reach them (HAS-49).
  assertPolicyLimitsAboveCommitted(input, {
    usedActions: existing.used_actions,
    reservedGasWei: BigInt(existing.reserved_gas_wei),
    spentGasWei: BigInt(existing.spent_gas_wei),
  });
  await assertAllowedVaultsAssociated(
    access.supabase,
    organizationId,
    input.allowedVaults,
  );
  const { data, error } = await access.supabase
    .from("organization_sponsorship_policies")
    .update({
      enabled: input.enabled,
      allowed_actions: input.allowedActions,
      allowed_vaults: input.allowedVaults.map((vault) => vault.toLowerCase()),
      max_actions: input.maxActions,
      max_actions_per_wallet_per_day: input.maxActionsPerWalletPerDay,
      max_gas_budget_wei: input.maxGasBudgetWei.toString(),
      updated_by_wallet: access.session.walletAddress,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .select("*")
    .single();
  if (error || !data) throw databaseUnavailable();
  return { ...mapPolicy(data), ...relayerStatus() };
}

async function assertAssociatedGrant(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
  vaultAddress: Address,
) {
  const { data, error } = await supabase
    .from("organization_grants")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("chain_id", CHAIN_ID)
    .eq("vault_address", vaultAddress.toLowerCase())
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (!data)
    throw new ApiError(
      404,
      "This GrantVault is not associated with the organization.",
    );
}

async function findRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
  vaultAddress: Address,
  actionType: SponsoredActionType,
  nonce: string,
) {
  const { data, error } = await supabase
    .from("sponsored_action_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("chain_id", CHAIN_ID)
    .eq("vault_address", vaultAddress.toLowerCase())
    .eq("action_type", actionType)
    .eq("nonce", nonce)
    .neq("status", "abandoned")
    .maybeSingle();
  if (error) throw databaseUnavailable();
  return data;
}

async function findRequestById(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
  vaultAddress: Address,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("sponsored_action_requests")
    .select("*")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .eq("chain_id", CHAIN_ID)
    .eq("vault_address", vaultAddress.toLowerCase())
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (!data) throw new ApiError(404, "Sponsored action request not found.");
  return data;
}

type GasEnvelope = {
  gasLimit: bigint;
  gasPrice: bigint;
  estimatedCost: bigint;
};

async function estimateActionGas(
  client: Awaited<ReturnType<typeof readSponsoredActionSnapshot>>["client"],
  vaultAddress: Address,
  input: SponsoredActionInput,
  relayer: Address,
): Promise<GasEnvelope> {
  const common = {
    address: vaultAddress,
    abi: sponsoredGrantVaultAbi,
    account: relayer,
  } as const;
  const estimate =
    input.actionType === "claim"
      ? await client.estimateContractGas({
          ...common,
          functionName: "claimWithSignature",
          args: [
            input.amount,
            input.nonce,
            input.deadline,
            relayer,
            input.signature,
          ],
        })
      : await client.estimateContractGas({
          ...common,
          functionName: "approveMilestoneWithSignature",
          args: [
            BigInt(input.milestoneIndex),
            input.nonce,
            input.deadline,
            relayer,
            input.signature,
          ],
        });
  const gasLimit = (estimate * 125n + 99n) / 100n;
  const gasPrice = (await client.getGasPrice()) * 2n;
  return { gasLimit, gasPrice, estimatedCost: gasLimit * gasPrice };
}

async function reserveRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
  vaultAddress: Address,
  actorWallet: string,
  input: SponsoredActionInput,
  gas: GasEnvelope,
): Promise<SponsoredActionRequestRow> {
  const { data, error } = await supabase.rpc("reserve_sponsored_action", {
    p_organization_id: organizationId,
    p_chain_id: CHAIN_ID,
    p_vault_address: vaultAddress.toLowerCase(),
    p_action_type: input.actionType,
    p_actor_wallet: actorWallet.toLowerCase(),
    p_claim_amount:
      input.actionType === "claim" ? input.amount.toString() : null,
    p_milestone_index: input.milestoneIndex,
    p_nonce: input.nonce.toString(),
    p_deadline: input.deadline.toString(),
    p_relayer_address: input.relayerAddress.toLowerCase(),
    p_signature: input.signature,
    p_gas_limit: gas.gasLimit.toString(),
    p_gas_price: gas.gasPrice.toString(),
    p_estimated_gas_cost_wei: gas.estimatedCost.toString(),
  });
  if (error) {
    const match = policyErrorFromReserve(error.message);
    if (match) throw new ApiError(match[1], match[2]);
    throw databaseUnavailable();
  }
  const row = data?.[0];
  if (!row) throw databaseUnavailable();
  return row;
}

async function leaseRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  requestId: string,
) {
  const { data, error } = await supabase.rpc("lease_sponsored_action", {
    p_request_id: requestId,
  });
  if (error) throw databaseUnavailable();
  return data?.[0] ?? null;
}

async function updateRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  requestId: string,
  update: Partial<
    Pick<
      SponsoredActionRequestRow,
      | "status"
      | "processing_at"
      | "tx_hash"
      | "failure_code"
      | "failure_message"
      | "updated_at"
    >
  >,
) {
  const { data, error } = await supabase
    .from("sponsored_action_requests")
    .update(update)
    .eq("id", requestId)
    .select("*")
    .single();
  if (error || !data) throw databaseUnavailable();
  return data;
}

async function broadcastRequest(row: SponsoredActionRequestRow) {
  const { account, walletClient } = getSponsoredRelayer();
  if (account.address.toLowerCase() !== row.relayer_address)
    throw new Error("Configured relayer address changed.");
  const { client, snapshot } = await readSponsoredActionSnapshot(
    row.vault_address as Address,
  );
  if (!snapshot.supported)
    throw new Error("The sponsored action extension is unavailable.");
  const common = {
    address: row.vault_address as Address,
    abi: sponsoredGrantVaultAbi,
    account: account.address,
    gas: BigInt(row.gas_limit),
    gasPrice: BigInt(row.gas_price),
  } as const;
  if (row.action_type === "claim") {
    const simulation = await client.simulateContract({
      ...common,
      functionName: "claimWithSignature",
      args: [
        BigInt(row.claim_amount as string),
        BigInt(row.nonce),
        BigInt(row.deadline),
        account.address,
        row.signature as `0x${string}`,
      ],
    });
    return walletClient.writeContract({ ...simulation.request, account });
  }
  const simulation = await client.simulateContract({
    ...common,
    functionName: "approveMilestoneWithSignature",
    args: [
      BigInt(row.milestone_index as number),
      BigInt(row.nonce),
      BigInt(row.deadline),
      account.address,
      row.signature as `0x${string}`,
    ],
  });
  return walletClient.writeContract({ ...simulation.request, account });
}

async function settleReceipt(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  row: SponsoredActionRequestRow,
  receipt: NonNullable<Awaited<ReturnType<typeof readTransactionReceipt>>>,
) {
  const success = receipt.status === "success";
  const actualCost = receipt.gasUsed * receipt.effectiveGasPrice;
  const { data, error } = await supabase.rpc("settle_sponsored_action", {
    p_request_id: row.id,
    p_status: success ? "confirmed" : "failed",
    p_gas_used: receipt.gasUsed.toString(),
    p_effective_gas_price: receipt.effectiveGasPrice.toString(),
    p_actual_gas_cost_wei: actualCost.toString(),
    p_block_number: receipt.blockNumber.toString(),
    p_failure_code: success ? null : "transaction_reverted",
    p_failure_message: success
      ? null
      : "The sponsored transaction reverted on HSK. The wallet-paid action remains available.",
  });
  if (error || !data?.[0]) throw databaseUnavailable();
  return data[0];
}

async function refreshSubmittedRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  row: SponsoredActionRequestRow,
) {
  if (row.status !== "submitted" || !row.tx_hash) return row;
  let receipt;
  try {
    receipt = await readTransactionReceipt(row.tx_hash as Hash);
  } catch {
    return row;
  }
  return receipt ? settleReceipt(supabase, row, receipt) : row;
}

async function processRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  row: SponsoredActionRequestRow,
  options: { retryFailed: boolean } = { retryFailed: true },
): Promise<SponsoredActionRequest> {
  if (row.status === "submitted")
    return mapRequest(await refreshSubmittedRequest(supabase, row));
  if (!canAutoRecoverSponsoredRequest(row, options)) return mapRequest(row);
  if (isFreshProcessingLease(row)) return mapRequest(row);

  if (BigInt(row.deadline) <= BigInt(Math.floor(Date.now() / 1000))) {
    await expireReservations(supabase, row.organization_id);
    return mapRequest(
      await findRequestById(
        supabase,
        row.organization_id,
        row.vault_address as Address,
        row.id,
      ),
    );
  }

  const leased = await leaseRequest(supabase, row.id);
  if (!leased) {
    const current = await findRequestById(
      supabase,
      row.organization_id,
      row.vault_address as Address,
      row.id,
    );
    return mapRequest(
      current.status === "submitted"
        ? await refreshSubmittedRequest(supabase, current)
        : current,
    );
  }

  try {
    const hash = await broadcastRequest(leased);
    return mapRequest(
      await updateRequest(supabase, leased.id, {
        status: "submitted",
        tx_hash: hash,
        updated_at: new Date().toISOString(),
      }),
    );
  } catch (error) {
    const failure = classifyRelayerFailure(error);
    return mapRequest(
      await updateRequest(supabase, leased.id, {
        status: "failed",
        failure_code: failure.code,
        failure_message: failure.message,
        updated_at: new Date().toISOString(),
      }),
    );
  }
}

async function recoverActionSigner(
  vaultAddress: Address,
  input: SponsoredActionInput,
  snapshot: Extract<SponsoredActionSnapshot, { supported: true }>,
) {
  try {
    return input.actionType === "claim"
      ? await recoverTypedDataAddress({
          domain: {
            ...SPONSORED_ACTION_DOMAIN,
            chainId: CHAIN_ID,
            verifyingContract: vaultAddress,
          },
          types: SPONSORED_CLAIM_TYPES,
          primaryType: "SponsoredClaim",
          message: {
            vault: vaultAddress,
            beneficiary: snapshot.beneficiary,
            amount: input.amount,
            nonce: input.nonce,
            deadline: input.deadline,
            relayer: input.relayerAddress,
          },
          signature: input.signature,
        })
      : await recoverTypedDataAddress({
          domain: {
            ...SPONSORED_ACTION_DOMAIN,
            chainId: CHAIN_ID,
            verifyingContract: vaultAddress,
          },
          types: SPONSORED_REVIEW_TYPES,
          primaryType: "SponsoredMilestoneApproval",
          message: {
            vault: vaultAddress,
            reviewer: snapshot.reviewer,
            milestoneIndex: BigInt(input.milestoneIndex),
            nonce: input.nonce,
            deadline: input.deadline,
            relayer: input.relayerAddress,
          },
          signature: input.signature,
        });
  } catch {
    throw new ApiError(400, "The sponsored action signature is invalid.");
  }
}

export async function submitSponsoredAction(
  organizationId: string,
  vaultAddress: Address,
  input: SponsoredActionInput,
) {
  const access = await requireOrganizationMember(organizationId);
  await assertAssociatedGrant(access.supabase, organizationId, vaultAddress);
  const relayerAddress = getSponsoredRelayerAddress();
  if (input.relayerAddress.toLowerCase() !== relayerAddress.toLowerCase())
    throw new ApiError(
      409,
      "The sponsored action relayer changed. Request a new signature.",
    );

  const existing = await findRequest(
    access.supabase,
    organizationId,
    vaultAddress,
    input.actionType,
    input.nonce.toString(),
  );
  if (existing) {
    if (!sameSignedBinding(existing, input, access.session.walletAddress))
      throw new ApiError(
        409,
        "A different request already uses this action nonce.",
      );
    return processRequest(access.supabase, existing, { retryFailed: true });
  }

  assertSponsoredActionDeadline(input.deadline);
  const { client, snapshot } = await readSponsoredActionSnapshot(vaultAddress);
  if (!snapshot.supported)
    throw new ApiError(
      409,
      "This GrantVault predates sponsored actions. Use the wallet-paid action.",
    );
  const expectedSigner = assertLiveAction(
    input,
    snapshot,
    access.session.walletAddress,
  );
  const recovered = await recoverActionSigner(vaultAddress, input, snapshot);
  if (recovered.toLowerCase() !== expectedSigner.toLowerCase())
    throw new ApiError(400, "The signature is not from the required wallet.");

  const gas = await estimateActionGas(
    client,
    vaultAddress,
    input,
    relayerAddress,
  );
  const reserved = await reserveRequest(
    access.supabase,
    organizationId,
    vaultAddress,
    access.session.walletAddress,
    input,
    gas,
  );
  return processRequest(access.supabase, reserved, { retryFailed: true });
}

export async function getSponsoredActionStatus(
  organizationId: string,
  vaultAddress: Address,
  requestId: string,
) {
  const access = await requireOrganizationMember(organizationId);
  await assertAssociatedGrant(access.supabase, organizationId, vaultAddress);
  await expireReservations(access.supabase, organizationId);
  const request = await findRequestById(
    access.supabase,
    organizationId,
    vaultAddress,
    requestId,
  );
  return processRequest(access.supabase, request, { retryFailed: false });
}

export async function getSponsoredActionStatusByNonce(
  organizationId: string,
  vaultAddress: Address,
  actionType: SponsoredActionType,
  nonce: bigint,
) {
  const access = await requireOrganizationMember(organizationId);
  await assertAssociatedGrant(access.supabase, organizationId, vaultAddress);
  await expireReservations(access.supabase, organizationId);
  const request = await findRequest(
    access.supabase,
    organizationId,
    vaultAddress,
    actionType,
    nonce.toString(),
  );
  if (!request) return null;
  return processRequest(access.supabase, request, { retryFailed: false });
}
