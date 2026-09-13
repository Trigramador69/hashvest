import "server-only";

import { createPublicClient, erc20Abi, http, type Address } from "viem";

import { grantVaultAbi, hskTestnet } from "@hashvest/web3";

import { ApiError } from "@/lib/shared/api-error";
import type {
  OrganizationGrantReads,
  OrganizationGrantSnapshot,
} from "@/lib/dashboard/organization-snapshot";
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

/**
 * How many associated vaults one server-side report read covers.
 *
 * Each vault costs about twenty RPC reads, so an organization with a long tail
 * of grants would turn one click into a stampede. Vaults past the limit are
 * reported as omitted rather than dropped, because a smaller confident-looking
 * number is worse than a visibly partial one.
 */
export const ORGANIZATION_REPORT_VAULT_LIMIT = 12;

async function readOrganizationGrantSnapshot(
  client: ReturnType<typeof publicClient>,
  address: Address,
): Promise<OrganizationGrantSnapshot> {
  // One block for every field, so related metrics cannot disagree.
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
    revocation,
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
  const tokenContract = { address: token, abi: erc20Abi, blockNumber } as const;
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
    revoked: revocation.revoked,
    revokedAt: revocation.revokedAt,
    milestones,
    blockNumber,
    readAt: Date.now(),
  };
}

/**
 * Read an organization's associated vaults from the server.
 *
 * The same values the Reports page derives in the browser, read again here.
 * That duplication is the point: an advisory summary that quoted figures the
 * browser sent would be summarizing the caller, not the chain.
 */
export async function readOrganizationGrantSnapshots(
  addresses: readonly Address[],
): Promise<OrganizationGrantReads & { omitted: Address[] }> {
  const included = addresses.slice(0, ORGANIZATION_REPORT_VAULT_LIMIT);
  const client = publicClient();
  const results = await Promise.allSettled(
    included.map((address) => readOrganizationGrantSnapshot(client, address)),
  );
  return {
    snapshots: results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    ),
    unreadable: included.flatMap((address, index) =>
      results[index]?.status === "rejected" ? [{ vaultAddress: address }] : [],
    ),
    omitted: addresses.slice(ORGANIZATION_REPORT_VAULT_LIMIT) as Address[],
  };
}
