"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { erc20Abi, zeroAddress, type Address } from "viem";
import {
  grantVaultAbi,
  eligibilityProviderAbi,
  hskTestnet,
  sponsoredGrantVaultAbi,
  quorumGrantVaultAbi,
} from "@hashvest/web3";

import { readRevocationState } from "@/lib/protocol/revocation";
import { useTranslations } from "@/lib/shared/i18n/provider";

const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

export function useToken(address: Address | undefined) {
  const t = useTranslations();
  const client = usePublicClient({ chainId: 133 });
  return useQuery({
    queryKey: ["token", 133, address],
    enabled: Boolean(address && client),
    staleTime: 60000,
    queryFn: async () => {
      if (!client || !address)
        throw new Error(t("tx.error.tokenAddressRequired"));
      const [decimals, symbol] = await Promise.all([
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "decimals",
        }),
        client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
      ]);
      return { decimals, symbol };
    },
  });
}

export function useGrant(address: Address) {
  const t = useTranslations();
  const client = usePublicClient({ chainId: 133 });
  return useQuery({
    queryKey: ["grant", 133, address],
    enabled: Boolean(client),
    refetchInterval: 7000,
    queryFn: async () => {
      if (!client) throw new Error(t("tx.error.rpcUnavailable", NETWORK));
      // One block snapshot keeps related metrics consistent as time advances.
      const blockNumber = await client.getBlockNumber();
      const contract = { address, abi: grantVaultAbi, blockNumber };
      const [
        title,
        issuer,
        beneficiary,
        reviewer,
        token,
        totalAllocation,
        strategy,
        start,
        cliff,
        duration,
        eligibilityProvider,
        claimedAmount,
        vestedByTime,
        milestoneUnlockedAmount,
        unlockedAmount,
        claimableAmount,
        milestones,
        initialUnlock,
        revocationState,
      ] = await Promise.all([
        client.readContract({ ...contract, functionName: "title" }),
        client.readContract({ ...contract, functionName: "issuer" }),
        client.readContract({ ...contract, functionName: "beneficiary" }),
        client.readContract({ ...contract, functionName: "reviewer" }),
        client.readContract({ ...contract, functionName: "token" }),
        client.readContract({ ...contract, functionName: "totalAllocation" }),
        client.readContract({ ...contract, functionName: "strategy" }),
        client.readContract({ ...contract, functionName: "start" }),
        client.readContract({ ...contract, functionName: "cliff" }),
        client.readContract({ ...contract, functionName: "duration" }),
        client.readContract({
          ...contract,
          functionName: "eligibilityProvider",
        }),
        client.readContract({ ...contract, functionName: "claimedAmount" }),
        client.readContract({ ...contract, functionName: "vestedByTime" }),
        client.readContract({
          ...contract,
          functionName: "milestoneUnlockedAmount",
        }),
        client.readContract({ ...contract, functionName: "unlockedAmount" }),
        client.readContract({ ...contract, functionName: "claimableAmount" }),
        client.readContract({ ...contract, functionName: "getMilestones" }),
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
      const [decimals, symbol, balance, beneficiaryBalance, eligibility] =
        await Promise.all([
          client.readContract({ ...tokenContract, functionName: "decimals" }),
          client.readContract({ ...tokenContract, functionName: "symbol" }),
          client.readContract({
            ...tokenContract,
            functionName: "balanceOf",
            args: [address],
          }),
          client.readContract({
            ...tokenContract,
            functionName: "balanceOf",
            args: [beneficiary],
          }),
          eligibilityProvider === zeroAddress
            ? Promise.resolve({ enabled: false, eligible: true, error: false })
            : client
                .readContract({
                  address: eligibilityProvider,
                  abi: eligibilityProviderAbi,
                  functionName: "isEligible",
                  args: [beneficiary],
                  blockNumber,
                })
                .then(
                  (eligible) => ({ enabled: true, eligible, error: false }),
                  () => ({ enabled: true, eligible: false, error: true }),
                ),
        ]);
      const sponsoredClaim = await (async () => {
        try {
          const supported = await client.readContract({
            address,
            abi: sponsoredGrantVaultAbi,
            functionName: "supportsSponsoredClaims",
            blockNumber,
          });
          if (!supported)
            return { supported: false as const, nonce: 0n, used: false };
          const [nonce, used] = await Promise.all([
            client.readContract({
              address,
              abi: sponsoredGrantVaultAbi,
              functionName: "sponsoredClaimNonce",
              blockNumber,
            }),
            client.readContract({
              address,
              abi: sponsoredGrantVaultAbi,
              functionName: "sponsoredClaimUsed",
              blockNumber,
            }),
          ]);
          return { supported: true as const, nonce, used };
        } catch {
          // Legacy GrantVaults do not expose the sponsored-claim extension.
          return { supported: false as const, nonce: 0n, used: false };
        }
      })();
      const quorum = await (async () => {
        try {
          const supported = await client.readContract({
            address,
            abi: quorumGrantVaultAbi,
            functionName: "supportsQuorumReviewers",
            blockNumber,
          });
          if (!supported) {
            return {
              supported: false as const,
              reviewers: [] as Address[],
              threshold: 0n,
              milestoneProgress: [] as {
                approvals: bigint;
                threshold: bigint;
                approved: boolean;
              }[],
            };
          }
          const [reviewers, threshold] = await Promise.all([
            client.readContract({
              address,
              abi: quorumGrantVaultAbi,
              functionName: "getReviewers",
              blockNumber,
            }),
            client.readContract({
              address,
              abi: quorumGrantVaultAbi,
              functionName: "threshold",
              blockNumber,
            }),
          ]);
          const milestoneProgress = await Promise.all(
            milestones.map((_, idx) =>
              client
                .readContract({
                  address,
                  abi: quorumGrantVaultAbi,
                  functionName: "getMilestoneApprovalProgress",
                  args: [BigInt(idx)],
                  blockNumber,
                })
                .then(([approvals, thresh, approved]) => ({
                  approvals,
                  threshold: thresh,
                  approved,
                })),
            ),
          );
          return {
            supported: true as const,
            reviewers: reviewers as Address[],
            threshold,
            milestoneProgress,
          };
        } catch {
          return {
            supported: false as const,
            reviewers: [] as Address[],
            threshold: 0n,
            milestoneProgress: [] as {
              approvals: bigint;
              threshold: bigint;
              approved: boolean;
            }[],
          };
        }
      })();
      const effectiveReviewers: readonly Address[] = quorum.supported
        ? quorum.reviewers
        : reviewer !== zeroAddress
          ? [reviewer]
          : [];
      return {
        title,
        issuer,
        beneficiary,
        reviewer,
        reviewers: effectiveReviewers,
        token,
        totalAllocation,
        strategy,
        start,
        cliff,
        duration,
        eligibilityProvider,
        claimedAmount,
        vestedByTime,
        milestoneUnlockedAmount,
        unlockedAmount,
        claimableAmount,
        milestones,
        initialUnlock,
        revocable: revocationState.revocable,
        revoked: revocationState.revoked,
        revokedAt: revocationState.revokedAt,
        revocationEarnedAmount: revocationState.revocationEarnedAmount,
        decimals,
        symbol,
        balance,
        beneficiaryBalance,
        eligibility,
        sponsoredClaim,
        quorum,
        blockNumber,
      };
    },
  });
}
