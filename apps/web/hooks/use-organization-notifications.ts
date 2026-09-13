"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { organizationApi } from "@/lib/cloud/organizations/client";
import type { OrganizationNotificationReadInput } from "@/lib/cloud/organizations/types";
import {
  deriveOrganizationNotifications,
  type GrantNotification,
} from "@/lib/dashboard/organization-notifications";

import { useOrganizationGrantSnapshots } from "./use-organization-grant-snapshots";
import { useOrganizationGrants } from "./use-organizations";
import { useSession } from "./use-session";

export const notificationReadsQueryKey = (organizationId: string) =>
  ["organization-notification-reads", organizationId] as const;

/**
 * A member's lifecycle notifications for one organization.
 *
 * The vault snapshots come from the shared per-vault cache, so opening this
 * panel costs no extra RPC reads when the overview or the report has already
 * read the same grants. Only the read marks are fetched from the Cloud; the
 * notifications themselves are derived here and never stored.
 */
export function useOrganizationNotifications(organizationId: string) {
  const { walletMatches } = useSession();
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const grants = useOrganizationGrants(organizationId);
  const reads = useOrganizationGrantSnapshots(grants.data);
  const marks = useQuery({
    queryKey: notificationReadsQueryKey(organizationId),
    queryFn: async () =>
      (await organizationApi.getNotificationReads(organizationId)).reads,
    enabled: walletMatches,
    staleTime: 15_000,
  });
  const markRead = useMutation({
    mutationFn: (inputs: OrganizationNotificationReadInput[]) =>
      organizationApi.markNotificationsRead(organizationId, inputs),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: notificationReadsQueryKey(organizationId),
      }),
  });
  const derived = deriveOrganizationNotifications({
    wallet: address,
    reads,
    readKeys: new Set(marks.data?.map((mark) => mark.notificationKey)),
  });
  return {
    ...derived,
    isPending: grants.isPending || marks.isPending || reads.isPending,
    hasError: grants.isError || marks.isError,
    markRead,
    /** Mark one derived notification, or every unread one, as seen. */
    mark: (notifications: GrantNotification[]) =>
      markRead.mutateAsync(
        notifications.map((notification) => ({
          notificationKey: notification.key,
          vaultAddress: notification.vaultAddress,
        })),
      ),
  };
}
