import "server-only";

import { createPublicClient, http, type Address, type Hash } from "viem";

import {
  grantVaultAbi,
  hskTestnet,
  sponsoredGrantVaultAbi,
} from "@hashvest/web3";

export type SponsoredActionSnapshot =
  | { supported: false }
  | {
      supported: true;
      beneficiary: Address;
      reviewer: Address;
      claimableAmount: bigint;
      claimNonce: bigint;
      reviewNonce: bigint;
      revoked: boolean;
      milestones: readonly {
        title: string;
        amount: bigint;
        approved: boolean;
      }[];
    };

export function createHskPublicClient() {
  const rpcUrl =
    process.env.HSK_TESTNET_RPC_URL?.trim() ||
    hskTestnet.rpcUrls.default.http[0];
  return createPublicClient({ chain: hskTestnet, transport: http(rpcUrl) });
}

function isMissingSponsoredExtension(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("function selector") ||
    message.includes("returned no data") ||
    message.includes("execution reverted")
  );
}

export async function readSponsoredActionSnapshot(address: Address) {
  const client = createHskPublicClient();
  const blockNumber = await client.getBlockNumber();
  let supported: boolean;
  try {
    supported = await client.readContract({
      address,
      abi: sponsoredGrantVaultAbi,
      functionName: "supportsSponsoredActions",
      blockNumber,
    });
  } catch (error) {
    if (!isMissingSponsoredExtension(error)) throw error;
    return { client, blockNumber, snapshot: { supported: false as const } };
  }
  if (!supported)
    return { client, blockNumber, snapshot: { supported: false as const } };
  const sponsoredContract = {
    address,
    abi: sponsoredGrantVaultAbi,
    blockNumber,
  };
  const grantContract = { address, abi: grantVaultAbi, blockNumber };
  const [
    beneficiary,
    reviewer,
    claimableAmount,
    claimNonce,
    reviewNonce,
    revoked,
    milestones,
  ] = await Promise.all([
    client.readContract({ ...grantContract, functionName: "beneficiary" }),
    client.readContract({ ...grantContract, functionName: "reviewer" }),
    client.readContract({ ...grantContract, functionName: "claimableAmount" }),
    client.readContract({
      ...sponsoredContract,
      functionName: "sponsoredClaimNonce",
    }),
    client.readContract({
      ...sponsoredContract,
      functionName: "sponsoredReviewNonce",
    }),
    client.readContract({ ...grantContract, functionName: "revoked" }),
    client.readContract({ ...grantContract, functionName: "getMilestones" }),
  ]);
  return {
    client,
    blockNumber,
    snapshot: {
      supported: true as const,
      beneficiary,
      reviewer,
      claimableAmount,
      claimNonce,
      reviewNonce,
      revoked,
      milestones,
    },
  };
}

export async function readTransactionReceipt(hash: Hash) {
  const client = createHskPublicClient();
  try {
    return await client.getTransactionReceipt({ hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/not found|unknown transaction|could not be found/i.test(message))
      return null;
    throw error;
  }
}
