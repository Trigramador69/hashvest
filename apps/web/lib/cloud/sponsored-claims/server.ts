import "server-only";

import { recoverTypedDataAddress, type Address, type Hash } from "viem";

import {
  SPONSORED_CLAIM_DOMAIN,
  SPONSORED_CLAIM_TYPES,
  sponsoredGrantVaultAbi,
} from "@hashvest/web3";

import { ApiError } from "@/lib/cloud/api-server";
import {
  requireOrganizationMember,
  requireOrganizationOwner,
} from "@/lib/cloud/organizations/server";
import type {
  SponsoredClaimPolicy,
  SponsoredClaimPolicyRow,
  SponsoredClaimRequest,
  SponsoredClaimRequestRow,
} from "@/lib/cloud/organizations/types";
import { createSupabaseAdmin } from "@/lib/cloud/supabase-server";
import {
  readSponsoredClaimSnapshot,
  readTransactionReceipt,
} from "@/lib/protocol/sponsored-claims-server";
import { getSponsoredRelayer, getSponsoredRelayerAddress } from "./relayer";
import {
  assertSponsoredClaimDeadline,
  type SponsoredClaimInput,
  type SponsorshipPolicyInput,
} from "./validation";

const CHAIN_ID = 133 as const;

export type SponsorshipPolicyResponse = SponsoredClaimPolicy & {
  relayerAddress: Address | null;
  relayerConfigured: boolean;
};

function databaseUnavailable(): ApiError {
  return new ApiError(503, "Workspace data is temporarily unavailable.");
}

function mapPolicy(row: SponsoredClaimPolicyRow): SponsoredClaimPolicy {
  return {
    organizationId: row.organization_id,
    enabled: row.enabled,
    maxClaims: row.max_claims,
    usedClaims: row.used_claims,
    remainingClaims: Math.max(0, row.max_claims - row.used_claims),
    updatedByWallet: row.updated_by_wallet,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRequest(row: SponsoredClaimRequestRow): SponsoredClaimRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    chainId: CHAIN_ID,
    vaultAddress: row.vault_address,
    beneficiaryWallet: row.beneficiary_wallet,
    amount: row.amount,
    nonce: row.nonce,
    deadline: row.deadline,
    relayerAddress: row.relayer_address,
    status: row.status,
    attempts: row.attempts,
    processingAt: row.processing_at,
    txHash: row.tx_hash,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensurePolicy(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
): Promise<SponsoredClaimPolicyRow> {
  const { data, error } = await supabase
    .from("sponsored_claim_policies")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from("sponsored_claim_policies")
    .insert({
      organization_id: organizationId,
      enabled: false,
      max_claims: 0,
      used_claims: 0,
      updated_by_wallet: null,
    })
    .select("*")
    .maybeSingle();
  if (!createError && created) return created;
  if (createError?.code !== "23505") throw databaseUnavailable();

  const { data: concurrent, error: concurrentError } = await supabase
    .from("sponsored_claim_policies")
    .select("*")
    .eq("organization_id", organizationId)
    .single();
  if (concurrentError || !concurrent) throw databaseUnavailable();
  return concurrent;
}

export async function getOrganizationSponsorshipPolicy(
  organizationId: string,
): Promise<SponsorshipPolicyResponse> {
  const access = await requireOrganizationMember(organizationId);
  const policy = mapPolicy(await ensurePolicy(access.supabase, organizationId));
  let relayerAddress: Address | null = null;
  try {
    relayerAddress = getSponsoredRelayerAddress();
  } catch {
    // The policy remains readable so the UI can preserve the manual fallback.
  }
  return {
    ...policy,
    relayerAddress,
    relayerConfigured: relayerAddress !== null,
  };
}

export async function updateOrganizationSponsorshipPolicy(
  organizationId: string,
  input: SponsorshipPolicyInput,
): Promise<SponsorshipPolicyResponse> {
  const access = await requireOrganizationOwner(organizationId);
  const existing = await ensurePolicy(access.supabase, organizationId);
  if (input.maxClaims < existing.used_claims)
    throw new ApiError(
      409,
      "The sponsorship limit cannot be lower than claims already reserved.",
    );
  const { data, error } = await access.supabase
    .from("sponsored_claim_policies")
    .update({
      enabled: input.enabled,
      max_claims: input.maxClaims,
      updated_by_wallet: access.session.walletAddress,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .select("*")
    .single();
  if (error || !data) throw databaseUnavailable();
  let relayerAddress: Address | null = null;
  try {
    relayerAddress = getSponsoredRelayerAddress();
  } catch {
    // Configuration status is deliberately represented in the response.
  }
  return {
    ...mapPolicy(data),
    relayerAddress,
    relayerConfigured: relayerAddress !== null,
  };
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
  nonce: string,
) {
  const { data, error } = await supabase
    .from("sponsored_claim_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("chain_id", CHAIN_ID)
    .eq("vault_address", vaultAddress.toLowerCase())
    .eq("nonce", nonce)
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
    .from("sponsored_claim_requests")
    .select("*")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .eq("chain_id", CHAIN_ID)
    .eq("vault_address", vaultAddress.toLowerCase())
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (!data) throw new ApiError(404, "Sponsored claim request not found.");
  return data;
}

function sameSignedBinding(
  row: SponsoredClaimRequestRow,
  input: SponsoredClaimInput,
  beneficiaryWallet: string,
): boolean {
  return (
    row.beneficiary_wallet === beneficiaryWallet.toLowerCase() &&
    row.amount === input.amount.toString() &&
    row.nonce === input.nonce.toString() &&
    row.deadline === input.deadline.toString() &&
    row.relayer_address === input.relayerAddress.toLowerCase() &&
    row.signature.toLowerCase() === input.signature.toLowerCase()
  );
}

async function reserveRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  organizationId: string,
  vaultAddress: Address,
  beneficiaryWallet: string,
  input: SponsoredClaimInput,
): Promise<SponsoredClaimRequestRow> {
  const { data, error } = await supabase.rpc("reserve_sponsored_claim", {
    p_organization_id: organizationId,
    p_chain_id: CHAIN_ID,
    p_vault_address: vaultAddress.toLowerCase(),
    p_beneficiary_wallet: beneficiaryWallet.toLowerCase(),
    p_amount: input.amount.toString(),
    p_nonce: input.nonce.toString(),
    p_deadline: input.deadline.toString(),
    p_relayer_address: input.relayerAddress.toLowerCase(),
    p_signature: input.signature,
  });
  if (error) {
    if (error.message.includes("SPONSORSHIP_DISABLED"))
      throw new ApiError(
        409,
        "This organization has not enabled sponsored claims.",
      );
    if (error.message.includes("SPONSORSHIP_LIMIT_REACHED"))
      throw new ApiError(
        409,
        "This organization has reached its sponsored claim limit.",
      );
    if (error.message.includes("CLAIM_BINDING_MISMATCH"))
      throw new ApiError(
        409,
        "A different request already uses this claim nonce.",
      );
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
  const { data, error } = await supabase.rpc("claim_sponsored_request", {
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
      SponsoredClaimRequestRow,
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
    .from("sponsored_claim_requests")
    .update(update)
    .eq("id", requestId)
    .select("*")
    .single();
  if (error || !data) throw databaseUnavailable();
  return data;
}

function relayerFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/insufficient funds|balance too low|insufficient balance/i.test(message))
    return {
      code: "relayer_insufficient_funds",
      message:
        "The organization relayer has insufficient HSK. Use the beneficiary-paid claim or contact the organization owner.",
    };
  if (
    /timeout|timed out|fetch failed|network|429|cloudflare|1015/i.test(message)
  )
    return {
      code: "relayer_unavailable",
      message:
        "The organization relayer is temporarily unavailable. Use the beneficiary-paid claim and retry later.",
    };
  return {
    code: "sponsored_claim_rejected",
    message:
      "The sponsored claim could not be submitted. Use the beneficiary-paid claim.",
  };
}

async function broadcastRequest(row: SponsoredClaimRequestRow) {
  const { account, walletClient } = getSponsoredRelayer();
  if (account.address.toLowerCase() !== row.relayer_address)
    throw new Error("Configured relayer address changed.");
  const { client, snapshot } = await readSponsoredClaimSnapshot(
    row.vault_address as Address,
  );
  if (!snapshot.supported)
    throw new Error(
      "The sponsored claim extension is unavailable on this vault.",
    );
  const simulation = await client.simulateContract({
    address: row.vault_address as Address,
    abi: sponsoredGrantVaultAbi,
    functionName: "claimWithSignature",
    args: [
      BigInt(row.amount),
      BigInt(row.nonce),
      BigInt(row.deadline),
      account.address,
      row.signature as `0x${string}`,
    ],
    account: account.address,
  });
  return walletClient.writeContract({ ...simulation.request, account });
}

async function refreshSubmittedRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  row: SponsoredClaimRequestRow,
) {
  if (row.status !== "submitted" || !row.tx_hash) return row;
  let receipt;
  try {
    receipt = await readTransactionReceipt(row.tx_hash as Hash);
  } catch {
    return row;
  }
  if (!receipt) return row;
  if (receipt.status === "success")
    return updateRequest(supabase, row.id, {
      status: "confirmed",
      updated_at: new Date().toISOString(),
    });
  return updateRequest(supabase, row.id, {
    status: "failed",
    failure_code: "transaction_reverted",
    failure_message:
      "The sponsored transaction reverted on HSK. The beneficiary-paid claim remains available.",
    updated_at: new Date().toISOString(),
  });
}

async function processRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  row: SponsoredClaimRequestRow,
): Promise<SponsoredClaimRequest> {
  if (row.status === "submitted")
    return mapRequest(await refreshSubmittedRequest(supabase, row));
  if (row.status === "confirmed" || row.status === "processing")
    return mapRequest(row);
  if (row.status === "failed" && row.tx_hash) return mapRequest(row);

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
    const failure = relayerFailure(error);
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

export async function submitSponsoredClaim(
  organizationId: string,
  vaultAddress: Address,
  input: SponsoredClaimInput,
) {
  const access = await requireOrganizationMember(organizationId);
  await assertAssociatedGrant(access.supabase, organizationId, vaultAddress);
  const relayerAddress = getSponsoredRelayerAddress();
  if (input.relayerAddress.toLowerCase() !== relayerAddress.toLowerCase())
    throw new ApiError(
      409,
      "The sponsored claim relayer changed. Request a new signature.",
    );

  const existing = await findRequest(
    access.supabase,
    organizationId,
    vaultAddress,
    input.nonce.toString(),
  );
  if (existing) {
    if (!sameSignedBinding(existing, input, access.session.walletAddress))
      throw new ApiError(
        409,
        "A different request already uses this claim nonce.",
      );
    return processRequest(access.supabase, existing);
  }

  assertSponsoredClaimDeadline(input.deadline);
  const { snapshot } = await readSponsoredClaimSnapshot(vaultAddress);
  if (!snapshot.supported)
    throw new ApiError(
      409,
      "This GrantVault predates sponsored claims. Use the beneficiary-paid claim.",
    );
  const beneficiary: Address = snapshot.beneficiary;
  if (beneficiary.toLowerCase() !== access.session.walletAddress)
    throw new ApiError(
      403,
      "Only the GrantVault beneficiary can request sponsorship.",
    );
  if (snapshot.used || snapshot.claimedAmount !== 0n)
    throw new ApiError(
      409,
      "Sponsored claims are available only for the first claim.",
    );
  if (input.nonce !== snapshot.nonce)
    throw new ApiError(
      409,
      "The sponsored claim nonce is stale. Request a new signature.",
    );
  if (input.amount > snapshot.claimableAmount)
    throw new ApiError(409, "The signed amount is no longer claimable.");

  let recovered: Address;
  try {
    recovered = await recoverTypedDataAddress({
      domain: {
        ...SPONSORED_CLAIM_DOMAIN,
        chainId: CHAIN_ID,
        verifyingContract: vaultAddress,
      },
      types: SPONSORED_CLAIM_TYPES,
      primaryType: "SponsoredClaim",
      message: {
        vault: vaultAddress,
        beneficiary,
        amount: input.amount,
        nonce: input.nonce,
        deadline: input.deadline,
        relayer: input.relayerAddress,
      },
      signature: input.signature,
    });
  } catch {
    throw new ApiError(400, "The sponsored claim signature is invalid.");
  }
  if (recovered.toLowerCase() !== access.session.walletAddress)
    throw new ApiError(
      400,
      "The sponsored claim signature is not from the beneficiary.",
    );

  const reserved = await reserveRequest(
    access.supabase,
    organizationId,
    vaultAddress,
    access.session.walletAddress,
    input,
  );
  return processRequest(access.supabase, reserved);
}

export async function getSponsoredClaimStatus(
  organizationId: string,
  vaultAddress: Address,
  requestId: string,
) {
  const access = await requireOrganizationMember(organizationId);
  await assertAssociatedGrant(access.supabase, organizationId, vaultAddress);
  const request = await findRequestById(
    access.supabase,
    organizationId,
    vaultAddress,
    requestId,
  );
  return mapRequest(await refreshSubmittedRequest(access.supabase, request));
}

export async function getSponsoredClaimStatusByNonce(
  organizationId: string,
  vaultAddress: Address,
  nonce: bigint,
) {
  const access = await requireOrganizationMember(organizationId);
  await assertAssociatedGrant(access.supabase, organizationId, vaultAddress);
  const request = await findRequest(
    access.supabase,
    organizationId,
    vaultAddress,
    nonce.toString(),
  );
  if (!request) return null;
  return mapRequest(await refreshSubmittedRequest(access.supabase, request));
}
