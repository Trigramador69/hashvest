"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { hashVestFactoryAbi, testnetDeployment } from "@hashvest/web3";
import { Button, buttonVariants } from "@/components/ui/button";
import { NetworkNotice, Notice, PageHeading } from "@/components/grant-ui";
import { DemoFaucet } from "@/components/demo-faucet";
import { GrantCard } from "@/components/grant-card";
import { SessionControl } from "@/components/session-control";
import { useOrganizations } from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { errorMessage } from "@/lib/grants";

const tabs = ["Issued", "Received", "Review"] as const;
const methods = [
  "getGrantsByIssuer",
  "getGrantsByBeneficiary",
  "getGrantsByReviewer",
] as const;

function OrganizationsSection({ isConnected }: { isConnected: boolean }) {
  const session = useSession();
  const organizations = useOrganizations();
  if (!isConnected) return null;
  if (session.isError)
    return (
      <Notice title="Workspace context is not configured" error>
        <p>
          Direct onchain grants remain available. Set the server-only auth and
          Supabase variables to enable organizations.
        </p>
      </Notice>
    );
  if (!session.walletMatches)
    return (
      <Notice title="Sign in to manage organizations">
        <p>
          Organization context is separate from wallet connection and needs one
          explicit signature.
        </p>
        <div className="mt-4">
          <SessionControl />
        </div>
      </Notice>
    );
  if (organizations.isPending)
    return (
      <Notice title="Loading your organizations">
        <p>Reading workspace memberships…</p>
      </Notice>
    );
  if (organizations.isError)
    return (
      <Notice title="Organizations could not be loaded" error>
        <p>{errorMessage(organizations.error)}</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => void organizations.refetch()}
        >
          Retry
        </Button>
      </Notice>
    );
  return (
    <section className="space-y-4" aria-labelledby="organizations-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
            Your workspaces
          </p>
          <h2
            id="organizations-heading"
            className="mt-2 text-2xl font-semibold tracking-tight"
          >
            Organizations provide context.
          </h2>
        </div>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/app/organizations/new"
        >
          + Create organization
        </Link>
      </div>
      {!organizations.data?.length ? (
        <div className="rounded-xl border border-dashed p-8">
          <p className="font-semibold">Create your first organization</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Set up a workspace for your team, ecosystem, or treasury. You become
            the owner automatically.
          </p>
          <Link
            className={`${buttonVariants()} mt-4`}
            href="/app/organizations/new"
          >
            Set up workspace →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {organizations.data.map((organization) => (
            <Link
              key={organization.id}
              href={`/app/organizations/${organization.id}`}
              className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{organization.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {organization.memberCount} members ·{" "}
                    {organization.grantCount} grants
                  </p>
                </div>
                <span className="text-primary" aria-hidden>
                  ↗
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
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
      <OrganizationsSection isConnected={isConnected} />
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
