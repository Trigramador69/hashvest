"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { erc20Abi, zeroAddress, type Address } from "viem";
import { grantVaultAbi, eligibilityProviderAbi } from "@hashvest/web3";

export function useToken(address: Address | undefined) {
  const client = usePublicClient({ chainId: 133 });
  return useQuery({
    queryKey: ["token", 133, address],
    enabled: Boolean(address && client),
    staleTime: 60000,
    queryFn: async () => {
      if (!client || !address) throw new Error("Token address is required.");
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
  const client = usePublicClient({ chainId: 133 });
  return useQuery({
    queryKey: ["grant", 133, address],
    enabled: Boolean(client),
    refetchInterval: 7000,
    queryFn: async () => {
      if (!client) throw new Error("HSK Testnet RPC is unavailable.");
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
        revocable,
        revoked,
        revokedAt,
        revocationEarnedAmount,
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
          .readContract({ ...contract, functionName: "revocable" })
          .catch(() => false),
        client
          .readContract({ ...contract, functionName: "revoked" })
          .catch(() => false),
        client
          .readContract({ ...contract, functionName: "revokedAt" })
          .catch(() => 0n),
        client
          .readContract({ ...contract, functionName: "revocationEarnedAmount" })
          .catch(() => 0n),
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
      return {
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
        revocable,
        revoked,
        revokedAt,
        revocationEarnedAmount,
        decimals,
        symbol,
        balance,
        beneficiaryBalance,
        eligibility,
        blockNumber,
      };
    },
  });
}
