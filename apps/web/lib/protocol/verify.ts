import "server-only";

import { createPublicClient, http, type Address } from "viem";

import { grantVaultAbi, hskTestnet } from "@hashvest/web3";

import { ApiError } from "@/lib/shared/api-error";

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
