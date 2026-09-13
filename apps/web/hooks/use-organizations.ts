"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { type Address } from "viem";
import { grantVaultAbi, quorumGrantVaultAbi, hskTestnet } from "@hashvest/web3";

import { organizationApi } from "@/lib/cloud/organizations/client";
import { deriveGrantLifecycle } from "@/lib/protocol/grant-state";
import { readRevocationState } from "@/lib/protocol/revocation";
import { resolveProtocolRoles } from "@/lib/protocol/roles";
import type { OrganizationTemplateContent } from "@/lib/shared/grant-presets/organization-template";
import { parseTemplateKey } from "@/lib/shared/grant-presets/template-key";
import { useGrantPresets } from "@/lib/shared/grant-presets/use-grant-presets";
import { useTranslations } from "@/lib/shared/i18n/provider";

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

const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

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

type GrantSummary = {
  vaultAddress: Address;
  issuer: Address;
  totalAllocation: bigint;
  claimedAmount: bigint;
  claimableAmount: bigint;
  beneficiary: Address;
  reviewer: Address;
  reviewers?: readonly Address[];
  milestones: readonly { approved: boolean }[];
  revoked: boolean;
};

export function useOrganizationGrantStats(
  grants: { vaultAddress: string }[] | undefined,
) {
  const t = useTranslations();
  const { address: walletAddress } = useAccount();
  const client = usePublicClient({ chainId: 133 });
  const queries = useQueries({
    queries: (grants ?? []).map((grant) => ({
      queryKey: ["organization-grant-summary", 133, grant.vaultAddress],
      enabled: Boolean(client),
      staleTime: 7_000,
      queryFn: async (): Promise<GrantSummary> => {
        if (!client) throw new Error(t("tx.error.rpcUnavailable", NETWORK));
        const address = grant.vaultAddress as Address;
        const blockNumber = await client.getBlockNumber();
        const contract = { address, abi: grantVaultAbi, blockNumber };
        const [
          issuer,
          totalAllocation,
          claimedAmount,
          claimableAmount,
          beneficiary,
          reviewer,
          milestones,
          revocationState,
          reviewers,
        ] = await Promise.all([
          client.readContract({ ...contract, functionName: "issuer" }),
          client.readContract({ ...contract, functionName: "totalAllocation" }),
          client.readContract({ ...contract, functionName: "claimedAmount" }),
          client.readContract({ ...contract, functionName: "claimableAmount" }),
          client.readContract({ ...contract, functionName: "beneficiary" }),
          client.readContract({ ...contract, functionName: "reviewer" }),
          client.readContract({ ...contract, functionName: "getMilestones" }),
          readRevocationState({
            revocable: () =>
              client.readContract({ ...contract, functionName: "revocable" }),
            revoked: () =>
              client.readContract({ ...contract, functionName: "revoked" }),
            revokedAt: () =>
              client.readContract({ ...contract, functionName: "revokedAt" }),
            revocationEarnedAmount: () =>
              client.readContract({
                ...contract,
                functionName: "revocationEarnedAmount",
              }),
          }),
          client
            .readContract({
              address,
              abi: quorumGrantVaultAbi,
              functionName: "getReviewers",
              blockNumber,
            })
            .catch(() => undefined),
        ]);
        return {
          vaultAddress: address,
          issuer,
          totalAllocation,
          claimedAmount,
          claimableAmount,
          beneficiary,
          reviewer,
          reviewers,
          milestones,
          revoked: revocationState.revoked,
        };
      },
    })),
  });
  const summaries = queries
    .map((query) => query.data)
    .filter((summary): summary is GrantSummary => Boolean(summary));
  const wallet = walletAddress?.toLowerCase();
  return {
    queries,
    isPending: queries.some((query) => query.isPending),
    hasError: queries.some((query) => query.isError),
    activeGrants: summaries.filter(
      (summary) =>
        deriveGrantLifecycle({
          totalAllocation: summary.totalAllocation,
          claimedAmount: summary.claimedAmount,
          revoked: summary.revoked,
        }) === "ACTIVE",
    ).length,
    pendingReviews: summaries.filter(
      (summary) =>
        resolveProtocolRoles(wallet, summary).isReviewer &&
        !summary.revoked &&
        summary.milestones.some((milestone) => !milestone.approved),
    ).length,
    claimableGrants: summaries.filter(
      (summary) =>
        resolveProtocolRoles(wallet, summary).isBeneficiary &&
        summary.claimableAmount > 0n,
    ).length,
  };
}
