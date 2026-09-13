"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { organizationApi } from "@/lib/cloud/organizations/client";
import { deriveGrantLifecycle } from "@/lib/protocol/grant-state";
import { resolveProtocolRoles } from "@/lib/protocol/roles";
import type { OrganizationTemplateContent } from "@/lib/shared/grant-presets/organization-template";
import { parseTemplateKey } from "@/lib/shared/grant-presets/template-key";
import { useGrantPresets } from "@/lib/shared/grant-presets/use-grant-presets";

import { useOrganizationGrantSnapshots } from "./use-organization-grant-snapshots";
import { useSession } from "./use-session";

export const organizationQueryKey = (organizationId: string) =>
  ["organization", organizationId] as const;
export const membersQueryKey = (organizationId: string) =>
  ["organization-members", organizationId] as const;
export const grantsQueryKey = (organizationId: string) =>
  ["organization-grants", organizationId] as const;
export const sponsorshipPolicyQueryKey = (organizationId: string) =>
  ["organization-sponsorship-policy", organizationId] as const;
export const grantContextQueryKey = (vaultAddress: string) =>
  ["grant-context", 133, vaultAddress] as const;
export const grantEvidenceQueryKey = (
  organizationId: string,
  vaultAddress: string,
) =>
  ["organization-grant-evidence", 133, organizationId, vaultAddress] as const;
export const templatesQueryKey = (
  organizationId: string,
  includeArchived = false,
) =>
  [
    "organization-templates",
    organizationId,
    includeArchived ? "all" : "active",
  ] as const;

export function useOrganizations() {
  const { walletMatches } = useSession();
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () =>
      (await organizationApi.getOrganizations()).organizations,
    enabled: walletMatches,
    staleTime: 30_000,
  });
}

export function useOrganization(organizationId: string | undefined) {
  const { walletMatches } = useSession();
  return useQuery({
    queryKey: organizationId
      ? organizationQueryKey(organizationId)
      : ["organization", "missing"],
    queryFn: () => organizationApi.getOrganization(organizationId as string),
    enabled: Boolean(organizationId && walletMatches),
    staleTime: 15_000,
  });
}

export function useOrganizationMembers(organizationId: string | undefined) {
  const { walletMatches } = useSession();
  return useQuery({
    queryKey: organizationId
      ? membersQueryKey(organizationId)
      : ["organization-members", "missing"],
    queryFn: async () =>
      (await organizationApi.getMembers(organizationId as string)).members,
    enabled: Boolean(organizationId && walletMatches),
    staleTime: 15_000,
  });
}

export function useOrganizationGrants(organizationId: string | undefined) {
  const { walletMatches } = useSession();
  return useQuery({
    queryKey: organizationId
      ? grantsQueryKey(organizationId)
      : ["organization-grants", "missing"],
    queryFn: async () =>
      (await organizationApi.getGrants(organizationId as string)).grants,
    enabled: Boolean(organizationId && walletMatches),
    staleTime: 15_000,
  });
}

export function useOrganizationSponsorshipPolicy(
  organizationId: string | undefined,
) {
  const { walletMatches } = useSession();
  return useQuery({
    queryKey: organizationId
      ? sponsorshipPolicyQueryKey(organizationId)
      : ["organization-sponsorship-policy", "missing"],
    queryFn: () =>
      organizationApi.getSponsorshipPolicy(organizationId as string),
    enabled: Boolean(organizationId && walletMatches),
    staleTime: 15_000,
  });
}

export function useGrantContext(vaultAddress: string | undefined) {
  const { walletMatches } = useSession();
  const query = useQuery({
    queryKey: vaultAddress
      ? grantContextQueryKey(vaultAddress)
      : ["grant-context", "missing"],
    queryFn: async () =>
      (await organizationApi.getGrantContext(vaultAddress as string)).context,
    enabled: Boolean(vaultAddress && walletMatches),
    retry: false,
    staleTime: 15_000,
  });
  return { ...query, data: walletMatches ? query.data : undefined };
}

export function useOrganizationGrantEvidence(
  organizationId: string | undefined,
  vaultAddress: string | undefined,
) {
  const { walletMatches } = useSession();
  const query = useQuery({
    queryKey:
      organizationId && vaultAddress
        ? grantEvidenceQueryKey(organizationId, vaultAddress)
        : ["organization-grant-evidence", "missing"],
    queryFn: async () =>
      (
        await organizationApi.getGrantEvidence(
          organizationId as string,
          vaultAddress as string,
        )
      ).evidence,
    enabled: Boolean(organizationId && vaultAddress && walletMatches),
    retry: false,
    staleTime: 15_000,
  });
  return { ...query, data: walletMatches ? query.data : undefined };
}

/**
 * An organization's templates (HAS-13).
 *
 * Any member may read them; only the owner's requests may change them, which
 * the routes enforce. `includeArchived` is for grant provenance only — a grant
 * can name a template that was deleted after it was created.
 */
export function useOrganizationTemplates(
  organizationId: string | undefined,
  options: { includeArchived?: boolean } = {},
) {
  const { walletMatches } = useSession();
  const includeArchived = Boolean(options.includeArchived);
  return useQuery({
    queryKey: organizationId
      ? templatesQueryKey(organizationId, includeArchived)
      : ["organization-templates", "missing"],
    queryFn: async () =>
      (
        await organizationApi.getTemplates(organizationId as string, {
          includeArchived,
        })
      ).templates,
    enabled: Boolean(organizationId && walletMatches),
    staleTime: 15_000,
  });
}

/**
 * The template a grant was created from, for provenance (HAS-13).
 *
 * Only an organization key needs a request, so a grant from a global preset or
 * an AI draft fetches nothing. Archived templates are included: deleting a
 * template must not blank the name on grants already created from it.
 */
export function useTemplateLabel(
  organizationId: string | undefined,
  templateKey: string | null | undefined,
) {
  const { templateLabel } = useGrantPresets();
  const isOrganizationKey =
    parseTemplateKey(templateKey)?.kind === "organization";
  const templates = useOrganizationTemplates(
    isOrganizationKey ? organizationId : undefined,
    { includeArchived: true },
  );
  return templateLabel(templateKey, templates.data);
}

function invalidateTemplates(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: ["organization-templates", organizationId],
  });
}

export function useCreateTemplate(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.createTemplate.bind(null, organizationId),
    onSuccess: () => invalidateTemplates(queryClient, organizationId),
  });
}

export function useUpdateTemplate(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      template,
      expectedVersion,
    }: {
      templateId: string;
      template: OrganizationTemplateContent;
      expectedVersion: number;
    }) =>
      organizationApi.updateTemplate(organizationId, templateId, {
        template,
        expectedVersion,
      }),
    onSuccess: () => invalidateTemplates(queryClient, organizationId),
  });
}

export function useArchiveTemplate(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.archiveTemplate.bind(null, organizationId),
    onSuccess: () => invalidateTemplates(queryClient, organizationId),
  });
}

function invalidateOrganization(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["organizations"] }),
    queryClient.invalidateQueries({
      queryKey: organizationQueryKey(organizationId),
    }),
    queryClient.invalidateQueries({
      queryKey: membersQueryKey(organizationId),
    }),
    queryClient.invalidateQueries({ queryKey: grantsQueryKey(organizationId) }),
  ]);
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.createOrganization,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useAddMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.addMember.bind(null, organizationId),
    onSuccess: () => invalidateOrganization(queryClient, organizationId),
  });
}

export function useUpdateMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      displayName,
      roleLabel,
    }: {
      memberId: string;
      displayName: string;
      roleLabel: string | null;
    }) =>
      organizationApi.updateMember(organizationId, memberId, {
        displayName,
        roleLabel,
      }),
    onSuccess: () => invalidateOrganization(queryClient, organizationId),
  });
}

export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.removeMember.bind(null, organizationId),
    onSuccess: () => invalidateOrganization(queryClient, organizationId),
  });
}

export function useLinkOrganizationGrant(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.linkGrant.bind(null, organizationId),
    onSuccess: () => invalidateOrganization(queryClient, organizationId),
  });
}

export function useUpdateOrganizationSponsorshipPolicy(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.updateSponsorshipPolicy.bind(
      null,
      organizationId,
    ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: sponsorshipPolicyQueryKey(organizationId),
      }),
  });
}

/**
 * Overview metrics for an organization, derived from the shared per-vault
 * snapshots. Role-scoped counts use the connected wallet's onchain role only:
 * a member never sees another member's review queue or claimable funds.
 */
export function useOrganizationGrantStats(
  grants: { vaultAddress: string }[] | undefined,
) {
  const { address: walletAddress } = useAccount();
  const reads = useOrganizationGrantSnapshots(grants);
  const wallet = walletAddress?.toLowerCase();
  return {
    queries: reads.queries,
    isPending: reads.isPending,
    hasError: reads.hasError,
    activeGrants: reads.snapshots.filter(
      (snapshot) =>
        deriveGrantLifecycle({
          totalAllocation: snapshot.totalAllocation,
          claimedAmount: snapshot.claimedAmount,
          revoked: snapshot.revoked,
        }) === "ACTIVE",
    ).length,
    pendingReviews: reads.snapshots.filter(
      (snapshot) =>
        resolveProtocolRoles(wallet, snapshot).isReviewer &&
        !snapshot.revoked &&
        snapshot.milestones.some((milestone) => !milestone.approved),
    ).length,
    claimableGrants: reads.snapshots.filter(
      (snapshot) =>
        resolveProtocolRoles(wallet, snapshot).isBeneficiary &&
        snapshot.claimableAmount > 0n,
    ).length,
  };
}
