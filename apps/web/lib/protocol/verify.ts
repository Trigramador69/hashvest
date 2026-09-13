import "server-only";

import { createPublicClient, http, type Address } from "viem";

import { grantVaultAbi, hskTestnet } from "@hashvest/web3";

import { ApiError } from "@/lib/shared/api-error";
import { readRevocationState } from "./revocation";

function publicClient() {
  const rpcUrl =
    process.env.HSK_TESTNET_RPC_URL?.trim() ||
    hskTestnet.rpcUrls.default.http[0];
  return createPublicClient({ chain: hskTestnet, transport: http(rpcUrl) });
}

function onchainReadError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /429|rate limit|timeout|timed out|fetch failed|network|cloudflare|1015/i.test(
    message,
  )
    ? new ApiError(
        503,
        "HSK Testnet could not be read right now. Retry the workspace sync.",
      )
    : new ApiError(
        422,
        "The address is not a readable HashVest GrantVault on HSK Testnet.",
      );
}

async function assertReadableGrantVault(
  client: ReturnType<typeof publicClient>,
  address: Address,
) {
  let code: string | undefined;
  try {
    if ((await client.getChainId()) !== 133)
      throw new ApiError(
        422,
        "The configured HSK RPC is not serving chain 133.",
      );
    code = await client.getCode({ address });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw onchainReadError(error);
  }
  if (!code || code === "0x")
    throw new ApiError(
      422,
      "The GrantVault address has no contract code on HSK Testnet.",
    );
}

export async function verifyGrantVault(address: Address) {
  const client = publicClient();
  await assertReadableGrantVault(client, address);
  try {
    const [issuer, title] = await Promise.all([
      client.readContract({
        address,
        abi: grantVaultAbi,
        functionName: "issuer",
      }),
      client.readContract({
        address,
        abi: grantVaultAbi,
        functionName: "title",
      }),
    ]);
    return { issuer, title };
  } catch (error) {
    throw onchainReadError(error);
  }
}

export async function verifyGrantMilestone(
  address: Address,
  milestoneIndex: number,
) {
  if (!Number.isSafeInteger(milestoneIndex) || milestoneIndex < 0)
    throw new ApiError(422, "Milestone index is invalid.");
  const client = publicClient();
  await assertReadableGrantVault(client, address);
  let milestones: readonly unknown[];
  try {
    milestones = await client.readContract({
      address,
      abi: grantVaultAbi,
      functionName: "getMilestones",
    });
  } catch (error) {
    throw onchainReadError(error);
  }
  if (milestoneIndex >= milestones.length)
    throw new ApiError(422, "Milestone index is outside this GrantVault.");
  return { milestoneCount: milestones.length };
}

/** Read-only, block-consistent projection; never accepts browser-supplied grant state. */
export async function readGrantReviewSnapshot(address: Address) {
  const client = publicClient();
  await assertReadableGrantVault(client, address);
  try {
    const block = await client.getBlock();
    const contract = { address, abi: grantVaultAbi, blockNumber: block.number };
    const [
      title,
      strategy,
      totalAllocation,
      claimedAmount,
      unlockedAmount,
      claimableAmount,
      milestones,
      revocation,
    ] = await Promise.all([
      client.readContract({ ...contract, functionName: "title" }),
      client.readContract({ ...contract, functionName: "strategy" }),
      client.readContract({ ...contract, functionName: "totalAllocation" }),
      client.readContract({ ...contract, functionName: "claimedAmount" }),
      client.readContract({ ...contract, functionName: "unlockedAmount" }),
      client.readContract({ ...contract, functionName: "claimableAmount" }),
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
    ]);
    if (milestones.length > 20)
      throw new ApiError(422, "Invalid milestone count.");
    return {
      blockNumber: block.number.toString(),
      blockTimestamp: Number(block.timestamp),
      title,
      strategy,
      totalAllocation: totalAllocation.toString(),
      claimedAmount: claimedAmount.toString(),
      unlockedAmount: unlockedAmount.toString(),
      claimableAmount: claimableAmount.toString(),
      revoked: revocation.revoked,
      milestones: milestones.map((item, index) => ({
        index,
        title: item.title,
        amount: item.amount.toString(),
        approved: item.approved,
      })),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw onchainReadError(error);
  }
}
