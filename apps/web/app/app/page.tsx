"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { hashVestFactoryAbi, testnetDeployment } from "@hashvest/web3";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AddressDisplay,
  NetworkNotice,
  Notice,
  PageHeading,
  Progress,
} from "@/components/grant-ui";
import { DemoFaucet } from "@/components/demo-faucet";
import { useGrant } from "@/hooks/use-grant";
import { errorMessage, percent, strategies, tokenAmount } from "@/lib/grants";

const tabs = ["Issued", "Received", "Review"] as const;
const methods = [
  "getGrantsByIssuer",
  "getGrantsByBeneficiary",
  "getGrantsByReviewer",
] as const;

function GrantCard({
  address,
  received,
}: {
  address: Address;
  received: boolean;
}) {
  const grant = useGrant(address);
  if (grant.isPending)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading grant {address.slice(0, 8)}…
        </CardContent>
      </Card>
    );
  if (!grant.data)
    return (
      <Notice title="Grant could not be loaded" error>
        <AddressDisplay address={address} />
        <p>{errorMessage(grant.error)}</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => void grant.refetch()}
        >
          Retry
        </Button>
      </Notice>
    );
  const g = grant.data;
  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
            {strategies[g.strategy]}
          </span>
          <span className="text-xs text-muted-foreground">
            {g.claimedAmount === g.totalAllocation ? "Completed" : "Active"}
          </span>
        </div>
        <Link
          href={`/grants/${address}`}
          className="pt-3 text-xl font-semibold leading-7 tracking-tight hover:text-primary"
        >
          {g.title} <span aria-hidden>↗</span>
        </Link>
      </CardHeader>
      <CardContent className="flex grow flex-col gap-5">
        <div>
          <p className="text-xs text-muted-foreground">Total allocation</p>
          <p className="mt-1 text-2xl font-semibold">
            {tokenAmount(g.totalAllocation, g.decimals)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {g.symbol}
            </span>
          </p>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span>Unlocked</span>
            <span>{percent(g.unlockedAmount, g.totalAllocation)}%</span>
          </div>
          <Progress
            value={percent(g.unlockedAmount, g.totalAllocation)}
            label="Grant unlocked"
          />
        </div>
        <div className="mt-auto flex flex-wrap justify-between gap-4 border-t pt-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Beneficiary</p>
            <AddressDisplay address={g.beneficiary} />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {received ? "Available to claim" : "Claimable"}
            </p>
            <p className="mt-1 text-sm font-semibold text-primary">
              {tokenAmount(g.claimableAmount, g.decimals)} {g.symbol}
            </p>
          </div>
        </div>
        {grant.isRefetchError && (
          <p className="text-xs text-destructive">
            Refresh failed. Values may be stale.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState(0);
  const { address, isConnected } = useAccount();
  const factory = testnetDeployment.factory;
  const grants = useReadContract({
    address: factory,
    abi: hashVestFactoryAbi,
    functionName: methods[tab],
    args: address ? [address] : undefined,
    chainId: 133,
    query: { enabled: Boolean(factory && address), refetchInterval: 7000 },
  });
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Your workspace"
        title="Grants, with purpose."
        action={
          <Link href="/grants/new" className={buttonVariants()}>
            Create grant <span aria-hidden>+</span>
          </Link>
        }
      >
        <p>Manage allocations, track unlocks, and move good work forward.</p>
      </PageHeading>
      <NetworkNotice />
      {!factory && (
        <Notice title="Testnet deployment is not configured">
          <p>
            The application needs the HashVest Testnet deployment before it can
            load or create real grants.
          </p>
        </Notice>
      )}
      {isConnected && factory && (
        <>
          <div
            role="tablist"
            aria-label="Grant role"
            className="flex gap-2 border-b pb-3"
          >
            {tabs.map((label, index) => (
              <Button
                key={label}
                role="tab"
                id={`role-${index}`}
                aria-selected={tab === index}
                aria-controls="grant-list"
                variant={tab === index ? "default" : "outline"}
                onClick={() => setTab(index)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div role="tabpanel" id="grant-list" aria-labelledby={`role-${tab}`}>
            {grants.isPending ? (
              <Notice title="Loading your grants">
                <p>Reading the factory on HSK Testnet…</p>
              </Notice>
            ) : grants.isError ? (
              <Notice title="Unable to load grants" error>
                <p>{errorMessage(grants.error)}</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => void grants.refetch()}
                >
                  Retry
                </Button>
              </Notice>
            ) : !grants.data?.length ? (
              <div className="rounded-2xl border border-dashed p-12 text-center">
                <p className="text-xl font-semibold">
                  {tab === 0
                    ? "Your first grant starts here."
                    : tab === 1
                      ? "No grants received yet."
                      : "No milestones to review yet."}
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                  {tab === 0
                    ? "Create a fully funded allocation with clear conditions for your beneficiary."
                    : tab === 1
                      ? "Grants assigned to this wallet will appear here automatically."
                      : "Grants that name this wallet as reviewer will appear here."}
                </p>
                {tab === 0 && (
                  <Link
                    className={`${buttonVariants()} mt-5`}
                    href="/grants/new"
                  >
                    Create a grant
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {grants.data.map((grant) => (
                  <GrantCard key={grant} address={grant} received={tab === 1} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <DemoFaucet />
    </div>
  );
}
