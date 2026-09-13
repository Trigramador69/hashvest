import "server-only";

import type { Address } from "viem";

import { ApiError } from "@/lib/cloud/api-server";
import { requireOrganizationMember } from "@/lib/cloud/organizations/server";
import type {
  OrganizationMilestoneEvidence,
  OrganizationMilestoneEvidenceInput,
  OrganizationMilestoneEvidenceRow,
} from "@/lib/cloud/organizations/types";
import { verifyGrantMilestone } from "@/lib/protocol/verify";

type MemberAccess = Awaited<ReturnType<typeof requireOrganizationMember>>;

function databaseUnavailable(): ApiError {
  return new ApiError(503, "Workspace data is temporarily unavailable.");
}

function mapEvidence(
  row: OrganizationMilestoneEvidenceRow,
): OrganizationMilestoneEvidence {
  return {
    chainId: 133,
    vaultAddress: row.vault_address,
    milestoneIndex: row.milestone_index,
    evidenceUrl: row.evidence_url,
    evidenceType: row.evidence_type,
    note: row.note,
    submittedByWallet: row.submitted_by_wallet,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertAssociatedGrant(
  access: MemberAccess,
  vaultAddress: Address,
) {
  const { data, error } = await access.supabase
    .from("organization_grants")
    .select("organization_id")
    .eq("organization_id", access.organization.id)
    .eq("chain_id", 133)
    .eq("vault_address", vaultAddress.toLowerCase())
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (!data)
    throw new ApiError(
      404,
      "This GrantVault is not associated with the organization.",
    );
}

export async function listGrantMilestoneEvidence(
  organizationId: string,
  vaultAddress: Address,
): Promise<OrganizationMilestoneEvidence[]> {
  const access = await requireOrganizationMember(organizationId);
  await assertAssociatedGrant(access, vaultAddress);
  const { data, error } = await access.supabase
    .from("organization_grant_milestone_evidence")
    .select("*")
    .eq("chain_id", 133)
    .eq("vault_address", vaultAddress.toLowerCase())
    .order("milestone_index", { ascending: true });
  if (error) throw databaseUnavailable();
  return data.map(mapEvidence);
}

export async function upsertGrantMilestoneEvidence(
  organizationId: string,
  vaultAddress: Address,
  milestoneIndex: number,
  input: OrganizationMilestoneEvidenceInput,
): Promise<OrganizationMilestoneEvidence> {
  const access = await requireOrganizationMember(organizationId);
  await assertAssociatedGrant(access, vaultAddress);
  await verifyGrantMilestone(vaultAddress, milestoneIndex);
  const { data, error } = await access.supabase
    .from("organization_grant_milestone_evidence")
    .upsert(
      {
        chain_id: 133,
        vault_address: vaultAddress.toLowerCase(),
        milestone_index: milestoneIndex,
        evidence_url: input.evidenceUrl,
        evidence_type: input.evidenceType,
        note: input.note,
        submitted_by_wallet: access.session.walletAddress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chain_id,vault_address,milestone_index" },
    )
    .select("*")
    .single();
  if (error || !data) throw databaseUnavailable();
  return mapEvidence(data);
}
