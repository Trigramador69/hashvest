"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { type Address } from "viem";
import { grantVaultAbi } from "@hashvest/web3";

import { organizationApi } from "@/lib/organizations/client";

import { useSession } from "./use-session";

export const organizationQueryKey = (organizationId: string) =>
  ["organization", organizationId] as const;
export const membersQueryKey = (organizationId: string) =>
  ["organization-members", organizationId] as const;
export const grantsQueryKey = (organizationId: string) =>
  ["organization-grants", organizationId] as const;
export const grantContextQueryKey = (vaultAddress: string) =>
  ["grant-context", 133, vaultAddress] as const;

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

export function useGrantContext(vaultAddress: string | undefined) {
  const { walletMatches } = useSession();
  return useQuery({
    queryKey: vaultAddress
      ? grantContextQueryKey(vaultAddress)
      : ["grant-context", "missing"],
    queryFn: async () =>
      (await organizationApi.getGrantContext(vaultAddress as string)).context,
    enabled: Boolean(vaultAddress && walletMatches),
    retry: false,
    staleTime: 15_000,
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

type GrantSummary = {
  vaultAddress: Address;
  totalAllocation: bigint;
  claimedAmount: bigint;
  claimableAmount: bigint;
  beneficiary: Address;
  reviewer: Address;
  milestones: readonly { approved: boolean }[];
};

export function useOrganizationGrantStats(
  grants: { vaultAddress: string }[] | undefined,
) {
  const { address: walletAddress } = useAccount();
  const client = usePublicClient({ chainId: 133 });
  const queries = useQueries({
    queries: (grants ?? []).map((grant) => ({
      queryKey: ["organization-grant-summary", 133, grant.vaultAddress],
      enabled: Boolean(client),
      staleTime: 7_000,
      queryFn: async (): Promise<GrantSummary> => {
        if (!client) throw new Error("HSK Testnet RPC is unavailable.");
        const address = grant.vaultAddress as Address;
        const blockNumber = await client.getBlockNumber();
        const contract = { address, abi: grantVaultAbi, blockNumber };
        const [
          totalAllocation,
          claimedAmount,
          claimableAmount,
          beneficiary,
          reviewer,
          milestones,
        ] = await Promise.all([
          client.readContract({ ...contract, functionName: "totalAllocation" }),
          client.readContract({ ...contract, functionName: "claimedAmount" }),
          client.readContract({ ...contract, functionName: "claimableAmount" }),
          client.readContract({ ...contract, functionName: "beneficiary" }),
          client.readContract({ ...contract, functionName: "reviewer" }),
          client.readContract({ ...contract, functionName: "getMilestones" }),
        ]);
        return {
          vaultAddress: address,
          totalAllocation,
          claimedAmount,
          claimableAmount,
          beneficiary,
          reviewer,
          milestones,
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
      (summary) => summary.claimedAmount < summary.totalAllocation,
    ).length,
    pendingReviews: summaries.filter(
      (summary) =>
        wallet &&
        summary.reviewer.toLowerCase() === wallet &&
        summary.milestones.some((milestone) => !milestone.approved),
    ).length,
    claimableGrants: summaries.filter(
      (summary) =>
        wallet &&
        summary.beneficiary.toLowerCase() === wallet &&
        summary.claimableAmount > 0n,
    ).length,
  };
}
