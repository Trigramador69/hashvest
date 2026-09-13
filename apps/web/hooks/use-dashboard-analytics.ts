"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { getAddress, parseAbiItem, type Address, type Hex } from "viem";
import {
  grantVaultAbi,
  hashVestFactoryAbi,
  testnetDeployment,
} from "@hashvest/web3";

import { useOrganizations } from "@/hooks/use-organizations";
import { organizationApi } from "@/lib/cloud/organizations/client";
import {
  aggregateDashboardAnalytics,
  type DashboardAnalytics,
  type DashboardChainEvent,
  type DashboardGrantSnapshot,
} from "@/lib/dashboard/analytics";

const FACTORY_START_BLOCK = BigInt(33032417);
const LOG_WINDOW = 50_000n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const factoryCreatedEvent = parseAbiItem(
  "event GrantCreated(address indexed vault, address indexed issuer, address indexed beneficiary, address reviewer, string title, uint8 strategy, bool revocable)",
);
const milestoneApprovedEvent = parseAbiItem(
  "event MilestoneApproved(address indexed reviewer, uint256 indexed index, uint256 amount)",
);
const tokensClaimedEvent = parseAbiItem(
  "event TokensClaimed(address indexed beneficiary, address indexed token, uint256 amount, uint256 totalClaimed)",
);
const grantRevokedEvent = parseAbiItem(
  "event GrantRevoked(address indexed issuer, uint256 recoveredAmount, uint256 earnedAmount)",
);

type PublicClient = NonNullable<ReturnType<typeof usePublicClient>>;
type EventAbi = NonNullable<
  NonNullable<Parameters<PublicClient["getLogs"]>[0]>["event"]
>;
type RawLog = {
  address: Address;
  blockNumber: bigint;
  transactionHash: Hex | null;
  args?: Record<string, unknown>;
};

function uniqueAddresses(addresses: readonly Address[]) {
  return [
    ...new Map(
      addresses.map((address) => [address.toLowerCase(), address]),
    ).values(),
  ];
}

async function batched<T>(
  items: readonly T[],
  worker: (item: T) => Promise<void>,
  concurrency = 4,
) {
  for (let index = 0; index < items.length; index += concurrency) {
    await Promise.all(items.slice(index, index + concurrency).map(worker));
  }
}

async function readAddressLogs({
  client,
  addresses,
  event,
  fromBlock,
  toBlock,
}: {
  client: PublicClient;
  addresses: Address[];
  event: EventAbi;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  const logs: RawLog[] = [];
  const windows: Array<[bigint, bigint]> = [];
  for (let start = fromBlock; start <= toBlock; start += LOG_WINDOW) {
    windows.push([
      start,
      start + LOG_WINDOW - 1n > toBlock ? toBlock : start + LOG_WINDOW - 1n,
    ]);
  }
  await batched(windows, async ([windowStart, windowEnd]) => {
    const result = await client.getLogs({
      address: addresses,
      event,
      fromBlock: windowStart,
      toBlock: windowEnd,
    });
    logs.push(...(result as unknown as RawLog[]));
  });
  return logs;
}

function readArg<T>(log: RawLog, key: string, fallback: T): T {
  return (log.args?.[key] as T | undefined) ?? fallback;
}

async function readDashboardData({
  client,
  wallet,
  organizationNames,
}: {
  client: PublicClient;
  wallet: Address;
  organizationNames: Map<string, string>;
}): Promise<DashboardAnalytics> {
  const factoryAddress = testnetDeployment.factory;
  if (!factoryAddress)
    throw new Error("HSK Testnet factory is not configured.");
  const blockNumber = await client.getBlockNumber();
  const [issued, received, review] = await Promise.all([
    client.readContract({
      address: factoryAddress,
      abi: hashVestFactoryAbi,
      functionName: "getGrantsByIssuer",
      args: [wallet],
    }),
    client.readContract({
      address: factoryAddress,
      abi: hashVestFactoryAbi,
      functionName: "getGrantsByBeneficiary",
      args: [wallet],
    }),
    client.readContract({
      address: factoryAddress,
      abi: hashVestFactoryAbi,
      functionName: "getGrantsByReviewer",
      args: [wallet],
    }),
  ]);
  const addresses = uniqueAddresses([
    ...issued,
    ...received,
    ...review,
  ] as Address[]);
  if (!addresses.length)
    return aggregateDashboardAnalytics({
      wallet,
      snapshots: [],
      events: [],
      now: new Date(),
    });

  const snapshots: DashboardGrantSnapshot[] = [];
  let partial = false;
  await batched(addresses, async (vaultAddress) => {
    try {
      const contract = {
        address: vaultAddress,
        abi: grantVaultAbi,
        blockNumber,
      } as const;
      const [
        title,
        strategy,
        totalAllocation,
        claimedAmount,
        claimableAmount,
        issuer,
        beneficiary,
        reviewer,
        revoked,
        milestones,
      ] = await Promise.all([
        client.readContract({ ...contract, functionName: "title" }),
        client.readContract({ ...contract, functionName: "strategy" }),
        client.readContract({ ...contract, functionName: "totalAllocation" }),
        client.readContract({ ...contract, functionName: "claimedAmount" }),
        client.readContract({ ...contract, functionName: "claimableAmount" }),
        client.readContract({ ...contract, functionName: "issuer" }),
        client.readContract({ ...contract, functionName: "beneficiary" }),
        client.readContract({ ...contract, functionName: "reviewer" }),
        client.readContract({ ...contract, functionName: "revoked" }),
        client.readContract({ ...contract, functionName: "getMilestones" }),
      ]);
      snapshots.push({
        vaultAddress,
        title,
        strategy: Number(strategy),
        totalAllocation,
        claimedAmount,
        claimableAmount,
        issuer,
        beneficiary,
        reviewer,
        revoked,
        pendingMilestones: milestones.filter((milestone) => !milestone.approved)
          .length,
        organizationName: organizationNames.get(vaultAddress.toLowerCase()),
      });
    } catch {
      partial = true;
    }
  });

  const events: DashboardChainEvent[] = [];
  try {
    const creationLogs = (await client.getLogs({
      address: factoryAddress,
      event: factoryCreatedEvent,
      fromBlock: FACTORY_START_BLOCK,
      toBlock: blockNumber,
    })) as unknown as RawLog[];
    const addressSet = new Set(
      addresses.map((address) => address.toLowerCase()),
    );
    const creationByVault = new Map<string, RawLog>();
    for (const log of creationLogs) {
      const vault = readArg<Address>(log, "vault", ZERO_ADDRESS).toLowerCase();
      if (addressSet.has(vault)) creationByVault.set(vault, log);
    }
    for (const snapshot of snapshots) {
      const log = creationByVault.get(snapshot.vaultAddress.toLowerCase());
      if (!log) continue;
      events.push({
        id: `created:${log.transactionHash ?? snapshot.vaultAddress}`,
        kind: "created",
        vaultAddress: snapshot.vaultAddress,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        timestamp: null,
        title: snapshot.title,
        strategy: snapshot.strategy,
      });
    }
    const [approvedLogs, claimedLogs, revokedLogs] = await Promise.all([
      readAddressLogs({
        client,
        addresses,
        event: milestoneApprovedEvent as EventAbi,
        fromBlock: FACTORY_START_BLOCK,
        toBlock: blockNumber,
      }),
      readAddressLogs({
        client,
        addresses,
        event: tokensClaimedEvent as EventAbi,
        fromBlock: FACTORY_START_BLOCK,
        toBlock: blockNumber,
      }),
      readAddressLogs({
        client,
        addresses,
        event: grantRevokedEvent as EventAbi,
        fromBlock: FACTORY_START_BLOCK,
        toBlock: blockNumber,
      }),
    ]);
    for (const log of approvedLogs)
      events.push({
        id: `approved:${log.transactionHash ?? log.blockNumber}:${readArg(log, "index", 0n)}`,
        kind: "approved",
        vaultAddress: log.address,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        timestamp: null,
        amount: readArg(log, "amount", 0n),
      });
    for (const log of claimedLogs)
      events.push({
        id: `claimed:${log.transactionHash ?? log.blockNumber}`,
        kind: "claimed",
        vaultAddress: log.address,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        timestamp: null,
        amount: readArg(log, "amount", 0n),
      });
    for (const log of revokedLogs)
      events.push({
        id: `revoked:${log.transactionHash ?? log.blockNumber}`,
        kind: "revoked",
        vaultAddress: log.address,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        timestamp: null,
        amount: readArg(log, "recoveredAmount", 0n),
      });
    const blockNumbers = [
      ...new Set(events.map((event) => event.blockNumber.toString())),
    ].map(BigInt);
    const timestamps = new Map<string, number>();
    await batched(blockNumbers, async (eventBlock) => {
      const block = await client.getBlock({ blockNumber: eventBlock });
      timestamps.set(eventBlock.toString(), Number(block.timestamp));
    });
    for (const event of events)
      event.timestamp = timestamps.get(event.blockNumber.toString()) ?? null;
  } catch {
    partial = true;
  }
  return aggregateDashboardAnalytics({
    wallet,
    snapshots,
    events,
    partial,
    now: new Date(),
  });
}

export function useDashboardAnalytics() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: 133 });
  const organizations = useOrganizations();
  const organizationQueries = useQueries({
    queries: (organizations.data ?? []).map((organization) => ({
      queryKey: ["dashboard-organization-grants", organization.id],
      queryFn: async () => organizationApi.getGrants(organization.id),
      enabled: Boolean(address),
      staleTime: 30_000,
    })),
  });
  const organizationNames = new Map<string, string>();
  organizations.data?.forEach((organization, index) => {
    const grants = organizationQueries[index]?.data?.grants ?? [];
    for (const grant of grants)
      organizationNames.set(
        grant.vaultAddress.toLowerCase(),
        organization.name,
      );
  });
  const query = useQuery({
    queryKey: [
      "wallet-dashboard-analytics",
      address?.toLowerCase(),
      [...organizationNames.keys()].sort(),
    ],
    queryFn: () =>
      readDashboardData({
        client: client as PublicClient,
        wallet: getAddress(address as string),
        organizationNames,
      }),
    enabled: Boolean(address && client && testnetDeployment.factory),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  return {
    ...query,
    status: !address
      ? ("idle" as const)
      : query.isError
        ? ("error" as const)
        : query.isPending
          ? ("loading" as const)
          : query.data?.partial
            ? ("partial" as const)
            : ("success" as const),
  };
}
