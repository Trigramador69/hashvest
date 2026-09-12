import "server-only";

import { getAddress, type Address } from "viem";

import { ApiError } from "@/lib/cloud/api-server";
import { readSession } from "@/lib/cloud/auth/session";
import { createSupabaseAdmin } from "@/lib/cloud/supabase-server";

import { verifyGrantVault } from "@/lib/protocol/verify";
import { validateUuid } from "./validation";
import type {
  Organization,
  OrganizationDetail,
  OrganizationGrant,
  OrganizationGrantContext,
  OrganizationGrantRow,
  OrganizationMember,
  OrganizationMemberRow,
  OrganizationMembership,
  OrganizationRow,
  OrganizationSummary,
  Session,
} from "./types";

type WorkspaceAccess = {
  supabase: ReturnType<typeof createSupabaseAdmin>;
  session: Session;
  organization: Organization;
  membership: OrganizationMembership;
};

function databaseUnavailable(): ApiError {
  return new ApiError(503, "Workspace data is temporarily unavailable.");
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    createdByWallet: row.created_by_wallet,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: OrganizationMemberRow): OrganizationMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    walletAddress: row.wallet_address,
    displayName: row.display_name,
    roleLabel: row.role_label,
    isOwner: row.is_owner,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMembership(row: OrganizationMemberRow): OrganizationMembership {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    displayName: row.display_name,
    roleLabel: row.role_label,
    isOwner: row.is_owner,
  };
}

function mapGrant(row: OrganizationGrantRow): OrganizationGrant {
  return {
    organizationId: row.organization_id,
    chainId: 133,
    vaultAddress: row.vault_address,
    description: row.description,
    templateKey: row.template_key,
    createdByWallet: row.created_by_wallet,
    createdAt: row.created_at,
  };
}

async function sessionAccess() {
  const session = await readSession();
  if (!session)
    throw new ApiError(401, "Sign in to your HashVest workspace first.");
  return { session, supabase: createSupabaseAdmin() };
}

export async function requireOrganizationMember(
  organizationId: string,
): Promise<WorkspaceAccess> {
  const id = validateUuid(organizationId);
  const { session, supabase } = await sessionAccess();
  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", id)
    .eq("wallet_address", session.walletAddress)
    .maybeSingle();
  if (memberError) throw databaseUnavailable();
  if (!member)
    throw new ApiError(403, "You are not a member of this organization.");
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (organizationError) throw databaseUnavailable();
  if (!organization) throw new ApiError(404, "Organization not found.");
  return {
    session,
    supabase,
    organization: mapOrganization(organization),
    membership: mapMembership(member),
  };
}

export async function requireOrganizationOwner(organizationId: string) {
  const access = await requireOrganizationMember(organizationId);
  if (!access.membership.isOwner)
    throw new ApiError(403, "Only the organization owner can do that.");
  return access;
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const { session, supabase } = await sessionAccess();
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("wallet_address", session.walletAddress);
  if (membershipError) throw databaseUnavailable();
  const ids = memberships.map((item) => item.organization_id);
  if (!ids.length) return [];
  const [organizationResult, membersResult, grantsResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_members")
      .select("organization_id")
      .in("organization_id", ids),
    supabase
      .from("organization_grants")
      .select("organization_id")
      .in("organization_id", ids),
  ]);
  if (organizationResult.error || membersResult.error || grantsResult.error)
    throw databaseUnavailable();
  const memberCounts = new Map<string, number>();
  const grantCounts = new Map<string, number>();
  for (const member of membersResult.data)
    memberCounts.set(
      member.organization_id,
      (memberCounts.get(member.organization_id) ?? 0) + 1,
    );
  for (const grant of grantsResult.data)
    grantCounts.set(
      grant.organization_id,
      (grantCounts.get(grant.organization_id) ?? 0) + 1,
    );
  return organizationResult.data.map((organization) => ({
    ...mapOrganization(organization),
    memberCount: memberCounts.get(organization.id) ?? 0,
    grantCount: grantCounts.get(organization.id) ?? 0,
  }));
}

export async function getOrganization(
  organizationId: string,
): Promise<OrganizationDetail> {
  const access = await requireOrganizationMember(organizationId);
  const [memberResult, grantResult] = await Promise.all([
    access.supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    access.supabase
      .from("organization_grants")
      .select("vault_address", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);
  if (memberResult.error || grantResult.error) throw databaseUnavailable();
  return {
    organization: {
      ...access.organization,
      memberCount: memberResult.count ?? 0,
      grantCount: grantResult.count ?? 0,
    },
    membership: access.membership,
  };
}

export async function createOrganization({
  name,
  displayName,
  roleLabel,
}: {
  name: string;
  displayName: string;
  roleLabel: string | null;
}): Promise<Organization> {
  const { session, supabase } = await sessionAccess();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({ name, created_by_wallet: session.walletAddress })
    .select("*")
    .single();
  if (organizationError || !organization) throw databaseUnavailable();
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organization.id,
      wallet_address: session.walletAddress,
      display_name: displayName,
      role_label: roleLabel,
      is_owner: true,
    });
  if (memberError) {
    await supabase.from("organizations").delete().eq("id", organization.id);
    throw databaseUnavailable();
  }
  return mapOrganization(organization);
}

export async function listMembers(organizationId: string) {
  const access = await requireOrganizationMember(organizationId);
  const { data, error } = await access.supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_owner", { ascending: false })
    .order("display_name", { ascending: true });
  if (error) throw databaseUnavailable();
  return data.map(mapMember);
}

export async function addMember(
  organizationId: string,
  member: {
    walletAddress: string;
    displayName: string;
    roleLabel: string | null;
  },
) {
  const access = await requireOrganizationOwner(organizationId);
  const { data, error } = await access.supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      wallet_address: member.walletAddress,
      display_name: member.displayName,
      role_label: member.roleLabel,
      is_owner: false,
    })
    .select("*")
    .single();
  if (error?.code === "23505")
    throw new ApiError(
      409,
      "That wallet is already a member of this organization.",
    );
  if (error || !data) throw databaseUnavailable();
  return mapMember(data);
}

export async function updateMember(
  organizationId: string,
  memberId: string,
  member: { displayName: string; roleLabel: string | null },
) {
  const access = await requireOrganizationOwner(organizationId);
  const { data: existing, error: existingError } = await access.supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", memberId)
    .maybeSingle();
  if (existingError) throw databaseUnavailable();
  if (!existing) throw new ApiError(404, "Member not found.");
  const { data, error } = await access.supabase
    .from("organization_members")
    .update({
      display_name: member.displayName,
      role_label: member.roleLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", memberId)
    .select("*")
    .single();
  if (error || !data) throw databaseUnavailable();
  return mapMember(data);
}

export async function removeMember(organizationId: string, memberId: string) {
  const access = await requireOrganizationOwner(organizationId);
  const { data: existing, error: existingError } = await access.supabase
    .from("organization_members")
    .select("is_owner")
    .eq("organization_id", organizationId)
    .eq("id", memberId)
    .maybeSingle();
  if (existingError) throw databaseUnavailable();
  if (!existing) throw new ApiError(404, "Member not found.");
  if (existing.is_owner)
    throw new ApiError(409, "The organization owner cannot be removed.");
  const { error } = await access.supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", memberId);
  if (error) throw databaseUnavailable();
}

export async function listGrants(organizationId: string) {
  const access = await requireOrganizationMember(organizationId);
  const { data, error } = await access.supabase
    .from("organization_grants")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw databaseUnavailable();
  return data.map(mapGrant);
}

export async function associateGrant(
  organizationId: string,
  grant: {
    chainId: 133;
    vaultAddress: string;
    description: string | null;
    templateKey: string | null;
  },
) {
  const access = await requireOrganizationOwner(organizationId);
  const normalizedAddress = getAddress(grant.vaultAddress) as Address;
  const { issuer } = await verifyGrantVault(normalizedAddress);
  if (issuer.toLowerCase() !== access.session.walletAddress)
    throw new ApiError(
      403,
      "Only the wallet that issued this GrantVault can link it to a workspace.",
    );
  const { data: existing, error: existingError } = await access.supabase
    .from("organization_grants")
    .select("*")
    .eq("chain_id", 133)
    .eq("vault_address", grant.vaultAddress)
    .maybeSingle();
  if (existingError) throw databaseUnavailable();
  if (existing && existing.organization_id !== organizationId)
    throw new ApiError(
      409,
      "This GrantVault is already linked to another organization.",
    );
  if (existing) {
    const { data, error } = await access.supabase
      .from("organization_grants")
      .update({
        description: grant.description,
        template_key: grant.templateKey,
      })
      .eq("chain_id", 133)
      .eq("vault_address", grant.vaultAddress)
      .select("*")
      .single();
    if (error || !data) throw databaseUnavailable();
    return mapGrant(data);
  }
  const { data, error } = await access.supabase
    .from("organization_grants")
    .insert({
      organization_id: organizationId,
      chain_id: 133,
      vault_address: grant.vaultAddress,
      description: grant.description,
      template_key: grant.templateKey,
      created_by_wallet: access.session.walletAddress,
    })
    .select("*")
    .single();
  if (error?.code === "23505")
    throw new ApiError(
      409,
      "This GrantVault was linked by another request. Retry the sync.",
    );
  if (error || !data) throw databaseUnavailable();
  return mapGrant(data);
}

export async function getGrantContext(
  vaultAddress: Address,
): Promise<OrganizationGrantContext | null> {
  const session = await readSession();
  if (!session) return null;
  const supabase = createSupabaseAdmin();
  const { data: grant, error: grantError } = await supabase
    .from("organization_grants")
    .select("*")
    .eq("chain_id", 133)
    .eq("vault_address", vaultAddress.toLowerCase())
    .maybeSingle();
  if (grantError) throw databaseUnavailable();
  if (!grant) return null;
  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", grant.organization_id)
    .eq("wallet_address", session.walletAddress)
    .maybeSingle();
  if (memberError) throw databaseUnavailable();
  if (!member) return null;
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", grant.organization_id)
    .single();
  if (organizationError || !organization) throw databaseUnavailable();
  return {
    organization: mapOrganization(organization),
    membership: mapMembership(member),
    grant: mapGrant(grant),
  };
}
