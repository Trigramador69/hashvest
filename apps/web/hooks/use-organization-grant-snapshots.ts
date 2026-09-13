"use client";

import { useQueries } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { grantVaultAbi, hskTestnet } from "@hashvest/web3";

import { readRevocationState } from "@/lib/protocol/revocation";
import type {
  OrganizationGrantReads,
  OrganizationGrantSnapshot,
} from "@/lib/dashboard/organization-snapshot";
import { useTranslations } from "@/lib/shared/i18n/provider";

const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

/**
 * One cache entry per vault, shared by the overview metrics, the organization
 * report and the lifecycle notifications. Reusing the key means three surfaces
 * that ask about the same grant make one set of RPC reads, and an invalidation
 * refreshes all of them together.
 */
export const organizationGrantSnapshotQueryKey = (vaultAddress: string) =>
  ["organization-grant-snapshot", 133, vaultAddress.toLowerCase()] as const;

/**
 * Read every organization-associated vault at a single block each.
 *
 * The discovery set is the Cloud association; the values are HSK's. A vault
 * whose read fails is reported in `unreadable` rather than dropped, so callers
 * can render a partial state instead of a smaller, confident-looking number.
 */
export function useOrganizationGrantSnapshots(
  grants: { vaultAddress: string }[] | undefined,
) {
  const t = useTranslations();
  const client = usePublicClient({ chainId: 133 });
  const queries = useQueries({
    queries: (grants ?? []).map((grant) => ({
      queryKey: organizationGrantSnapshotQueryKey(grant.vaultAddress),
      enabled: Boolean(client),
      staleTime: 7_000,
      queryFn: async (): Promise<OrganizationGrantSnapshot> => {
        if (!client) throw new Error(t("tx.error.rpcUnavailable", NETWORK));
        const address = grant.vaultAddress as Address;
        // One block snapshot keeps related metrics consistent as time advances.
        const blockNumber = await client.getBlockNumber();
        const contract = { address, abi: grantVaultAbi, blockNumber } as const;
        const [
          title,
          strategy,
          token,
          totalAllocation,
          claimedAmount,
          claimableAmount,
          unlockedAmount,
          start,
          cliff,
          duration,
          issuer,
          beneficiary,
          reviewer,
          milestones,
          initialUnlock,
          revocationState,
        ] = await Promise.all([
          client.readContract({ ...contract, functionName: "title" }),
          client.readContract({ ...contract, functionName: "strategy" }),
          client.readContract({ ...contract, functionName: "token" }),
          client.readContract({ ...contract, functionName: "totalAllocation" }),
          client.readContract({ ...contract, functionName: "claimedAmount" }),
          client.readContract({ ...contract, functionName: "claimableAmount" }),
          client.readContract({ ...contract, functionName: "unlockedAmount" }),
          client.readContract({ ...contract, functionName: "start" }),
          client.readContract({ ...contract, functionName: "cliff" }),
          client.readContract({ ...contract, functionName: "duration" }),
          client.readContract({ ...contract, functionName: "issuer" }),
          client.readContract({ ...contract, functionName: "beneficiary" }),
          client.readContract({ ...contract, functionName: "reviewer" }),
          client.readContract({ ...contract, functionName: "getMilestones" }),
          // Vaults deployed before the initial-unlock field do not expose it.
          client
            .readContract({ ...contract, functionName: "initialUnlock" })
            .catch(() => 0n),
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
        ]);
        const tokenContract = { address: token, abi: erc20Abi, blockNumber };
        const [decimals, symbol] = await Promise.all([
          client.readContract({ ...tokenContract, functionName: "decimals" }),
          client.readContract({ ...tokenContract, functionName: "symbol" }),
        ]);
        return {
          vaultAddress: address,
          title,
          strategy: Number(strategy),
          token,
          symbol,
          decimals,
          totalAllocation,
          claimedAmount,
          claimableAmount,
          unlockedAmount,
          initialUnlock,
          start,
          cliff,
          duration,
          issuer,
          beneficiary,
          reviewer,
          revoked: revocationState.revoked,
          revokedAt: revocationState.revokedAt,
          milestones,
          blockNumber,
          readAt: Date.now(),
        };
      },
    })),
  });
  const reads: OrganizationGrantReads = {
    snapshots: queries
      .map((query) => query.data)
      .filter((data): data is OrganizationGrantSnapshot => Boolean(data)),
    unreadable: (grants ?? [])
      .filter((_, index) => queries[index]?.isError)
      .map((grant) => ({ vaultAddress: grant.vaultAddress })),
  };
  return {
    queries,
    ...reads,
    isPending: queries.some((query) => query.isPending),
    hasError: queries.some((query) => query.isError),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
