import "server-only";

import { createPublicClient, http, type Address, type Hash } from "viem";

import {
  grantVaultAbi,
  hskTestnet,
  sponsoredGrantVaultAbi,
} from "@hashvest/web3";

export type SponsoredClaimSnapshot =
  | { supported: false }
  | {
      supported: true;
      beneficiary: Address;
      claimedAmount: bigint;
      claimableAmount: bigint;
      nonce: bigint;
      used: boolean;
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

export async function readSponsoredClaimSnapshot(address: Address) {
  const client = createHskPublicClient();
  const blockNumber = await client.getBlockNumber();
  let supported: boolean;
  try {
    supported = await client.readContract({
      address,
      abi: sponsoredGrantVaultAbi,
      functionName: "supportsSponsoredClaims",
      blockNumber,
    });
  } catch (error) {
    if (!isMissingSponsoredExtension(error)) throw error;
    return { client, blockNumber, snapshot: { supported: false as const } };
  }
  if (!supported)
    return { client, blockNumber, snapshot: { supported: false as const } };
  const contract = { address, abi: sponsoredGrantVaultAbi, blockNumber };
  const [beneficiary, claimedAmount, claimableAmount, nonce, used] =
    await Promise.all([
      client.readContract({
        address,
        abi: grantVaultAbi,
        functionName: "beneficiary",
        blockNumber,
      }),
      client.readContract({ ...contract, functionName: "claimedAmount" }),
      client.readContract({ ...contract, functionName: "claimableAmount" }),
      client.readContract({
        ...contract,
        functionName: "sponsoredClaimNonce",
      }),
      client.readContract({
        ...contract,
        functionName: "sponsoredClaimUsed",
      }),
    ]);
  return {
    client,
    blockNumber,
    snapshot: {
      supported: true as const,
      beneficiary: beneficiary as Address,
      claimedAmount,
      claimableAmount,
      nonce,
      used,
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
