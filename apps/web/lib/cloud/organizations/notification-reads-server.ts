import "server-only";

import { ApiError } from "@/lib/cloud/api-server";
import { requireOrganizationMember } from "@/lib/cloud/organizations/server";
import type {
  OrganizationNotificationRead,
  OrganizationNotificationReadInput,
  OrganizationNotificationReadRow,
} from "@/lib/cloud/organizations/types";

/**
 * How many read marks one member keeps for one organization.
 *
 * The derivation is already bounded, so this is a retention policy rather than
 * a safety valve: once a member is over the cap, the oldest marks are dropped.
 * Losing an old mark makes a retired notification look unread again at worst,
 * and a retired key stops being derived at all, so in practice nothing resurfaces.
 */
export const NOTIFICATION_READ_RETENTION = 200;

/** How many keys a single request may mark, so one call cannot bulk-insert. */
export const NOTIFICATION_READ_BATCH_LIMIT = 50;

type MemberAccess = Awaited<ReturnType<typeof requireOrganizationMember>>;

function databaseUnavailable(): ApiError {
  return new ApiError(503, "Workspace data is temporarily unavailable.");
}

function mapRead(
  row: OrganizationNotificationReadRow,
): OrganizationNotificationRead {
  return {
    organizationId: row.organization_id,
    memberWallet: row.member_wallet,
    notificationKey: row.notification_key,
    chainId: 133,
    vaultAddress: row.vault_address,
    readAt: row.read_at,
  };
}

async function assertAssociatedGrant(
  access: MemberAccess,
  vaultAddress: string,
) {
  const { data, error } = await access.supabase
    .from("organization_grants")
    .select("organization_id")
    .eq("organization_id", access.organization.id)
    .eq("chain_id", 133)
    .eq("vault_address", vaultAddress)
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (!data)
    throw new ApiError(
      404,
      "This GrantVault is not associated with the organization.",
    );
}

/**
 * The calling member's own read marks.
 *
 * Scoped to the session wallet, never to a requested one: a member cannot ask
 * what another member has read.
 */
export async function listNotificationReads(
  organizationId: string,
): Promise<OrganizationNotificationRead[]> {
  const access = await requireOrganizationMember(organizationId);
  const { data, error } = await access.supabase
    .from("organization_notification_reads")
    .select("*")
    .eq("organization_id", access.organization.id)
    .eq("member_wallet", access.session.walletAddress)
    .order("read_at", { ascending: false });
  if (error) throw databaseUnavailable();
  return data.map(mapRead);
}

/**
 * Mark notifications as read for the calling member.
 *
 * The keys are derived client-side from vault state, so each one is checked
 * against the vault it names and that vault is checked against the
 * organization. A key for a grant the organization is not associated with is
 * refused rather than stored.
 */
export async function markNotificationsRead(
  organizationId: string,
  inputs: OrganizationNotificationReadInput[],
): Promise<OrganizationNotificationRead[]> {
  if (!inputs.length) return [];
  if (inputs.length > NOTIFICATION_READ_BATCH_LIMIT)
    throw new ApiError(
      400,
      `A request may mark at most ${NOTIFICATION_READ_BATCH_LIMIT} notifications.`,
    );
  const access = await requireOrganizationMember(organizationId);
  const vaults = [...new Set(inputs.map((input) => input.vaultAddress))];
  for (const vaultAddress of vaults)
    await assertAssociatedGrant(access, vaultAddress);

  const readAt = new Date().toISOString();
  const { data, error } = await access.supabase
    .from("organization_notification_reads")
    .upsert(
      inputs.map((input) => ({
        organization_id: access.organization.id,
        member_wallet: access.session.walletAddress,
        notification_key: input.notificationKey,
        chain_id: 133 as const,
        vault_address: input.vaultAddress,
        read_at: readAt,
      })),
      { onConflict: "organization_id,member_wallet,notification_key" },
    )
    .select("*");
  if (error || !data) throw databaseUnavailable();
  await pruneNotificationReads(access);
  return data.map(mapRead);
}

/** Drop the oldest marks once the member is over the retention cap. */
async function pruneNotificationReads(access: MemberAccess) {
  const { data, error } = await access.supabase
    .from("organization_notification_reads")
    .select("notification_key")
    .eq("organization_id", access.organization.id)
    .eq("member_wallet", access.session.walletAddress)
    .order("read_at", { ascending: false });
  // Pruning is housekeeping: a failure here must not fail the member's write.
  if (error || !data || data.length <= NOTIFICATION_READ_RETENTION) return;
  const expired = data
    .slice(NOTIFICATION_READ_RETENTION)
    .map((row) => row.notification_key);
  await access.supabase
    .from("organization_notification_reads")
    .delete()
    .eq("organization_id", access.organization.id)
    .eq("member_wallet", access.session.walletAddress)
    .in("notification_key", expired);
}
