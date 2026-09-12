"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";

import {
  useLinkOrganizationGrant,
  useOrganization,
  useOrganizationGrantStats,
  useOrganizationGrants,
  useOrganizationMembers,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { useGrant } from "@/hooks/use-grant";
import { errorMessage, tokenAmount } from "@/lib/protocol/grants";
import { findMemberByWallet } from "@/lib/cloud/members";
import { resolveProtocolRoles } from "@/lib/protocol/roles";
import type {
  OrganizationGrant,
  OrganizationMember,
} from "@/lib/cloud/organizations/types";

import { GrantCard } from "./grant-card";
import { MembersPreview } from "./organization-ui";
import { Button, buttonVariants } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { FundingHealthSummary, GrantLifecycleBadge, Notice } from "./grant-ui";
import { deriveGrantState } from "@/lib/protocol/grant-state";

function LiveMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReviewQueueItem({
  grant,
  members,
}: {
  grant: OrganizationGrant;
  members: OrganizationMember[] | undefined;
}) {
  const { address } = useAccount();
  const live = useGrant(grant.vaultAddress as Address);
  if (live.isPending)
    return (
      <p className="text-sm text-muted-foreground">Reading review queue…</p>
    );
  if (live.isRefetchError)
    return (
      <p role="alert" className="text-sm text-destructive">
        Live review state is unavailable for this grant. Retry from the grant
        detail page.
      </p>
    );
  if (!live.data)
    return (
      <p role="alert" className="text-sm text-destructive">
        {errorMessage(live.error)}
      </p>
    );
  const state = deriveGrantState({
    totalAllocation: live.data.totalAllocation,
    claimedAmount: live.data.claimedAmount,
    vaultBalance: live.data.balance,
  });
  const roles = resolveProtocolRoles(address, live.data);
  const pending = live.data.milestones.filter(
    (milestone) => !milestone.approved,
  );
  if (!roles.isReviewer || !pending.length) return null;
  const reviewer = findMemberByWallet(members, live.data.reviewer);
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="mb-2">
            <GrantLifecycleBadge lifecycle={state.lifecycle} />
          </div>
          <p className="font-semibold">{live.data.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pending.length} pending milestone{pending.length === 1 ? "" : "s"}
            {reviewer ? ` · ${reviewer.displayName} is reviewer` : ""}
          </p>
          <p className="mt-2 text-sm">
            Next: <strong>{pending[0]?.title}</strong> ·{" "}
            {tokenAmount(pending[0]?.amount ?? 0n, live.data.decimals)}{" "}
            {live.data.symbol}
          </p>
          <div className="mt-4 max-w-xl">
            <FundingHealthSummary
              funding={state.funding}
              totalAllocation={live.data.totalAllocation}
              vaultBalance={live.data.balance}
              decimals={live.data.decimals}
              symbol={live.data.symbol}
              compact
            />
          </div>
        </div>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={`/grants/${grant.vaultAddress}`}
        >
          Review grant →
        </Link>
      </CardContent>
    </Card>
  );
}

function ClaimableQueueItem({
  grant,
  members,
}: {
  grant: OrganizationGrant;
  members: OrganizationMember[] | undefined;
}) {
  const { address } = useAccount();
  const live = useGrant(grant.vaultAddress as Address);
  if (live.isPending)
    return (
      <p className="text-sm text-muted-foreground">Reading claimable grant…</p>
    );
  if (live.isRefetchError)
    return (
      <p role="alert" className="text-sm text-destructive">
        Live beneficiary state is unavailable for this grant. Retry from the
        grant detail page.
      </p>
    );
  if (!live.data)
    return (
      <p role="alert" className="text-sm text-destructive">
        {errorMessage(live.error)}
      </p>
    );
  const state = deriveGrantState({
    totalAllocation: live.data.totalAllocation,
    claimedAmount: live.data.claimedAmount,
    vaultBalance: live.data.balance,
  });
  const roles = resolveProtocolRoles(address, live.data);
  if (!roles.isBeneficiary || live.data.claimableAmount === 0n) return null;
  const beneficiary = findMemberByWallet(members, live.data.beneficiary);
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="mb-2">
            <GrantLifecycleBadge lifecycle={state.lifecycle} />
          </div>
          <p className="font-semibold">{live.data.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {beneficiary?.displayName ?? "Beneficiary"} ·{" "}
            {grant.description ?? "Organization grant"}
          </p>
          <p className="mt-2 font-semibold text-primary">
            {tokenAmount(live.data.claimableAmount, live.data.decimals)}{" "}
            {live.data.symbol} claimable
          </p>
          <div className="mt-4 max-w-xl">
            <FundingHealthSummary
              funding={state.funding}
              totalAllocation={live.data.totalAllocation}
              vaultBalance={live.data.balance}
              decimals={live.data.decimals}
              symbol={live.data.symbol}
              compact
            />
          </div>
        </div>
        <Link
          className={buttonVariants()}
          href={`/grants/${grant.vaultAddress}`}
        >
          Open grant →
        </Link>
      </CardContent>
    </Card>
  );
}

function LinkExistingGrant({ organizationId }: { organizationId: string }) {
  const [vaultAddress, setVaultAddress] = useState("");
  const [description, setDescription] = useState("");
  const linkGrant = useLinkOrganizationGrant(organizationId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await linkGrant.mutateAsync({
        chainId: 133,
        vaultAddress: vaultAddress.trim(),
        description: description.trim() || null,
      });
      setVaultAddress("");
      setDescription("");
    } catch {
      // The mutation error is rendered below with its server-safe message.
    }
  }
  return (
    <details className="rounded-xl border p-5">
      <summary className="cursor-pointer text-sm font-semibold">
        Link an existing GrantVault
      </summary>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Use this for a grant that was created before workspace metadata, or to
        retry a failed metadata sync. The server checks the onchain issuer.
      </p>
      <form className="mt-4 space-y-4" onSubmit={(event) => void submit(event)}>
        <input
          className="field font-mono"
          value={vaultAddress}
          onChange={(event) => setVaultAddress(event.target.value)}
          placeholder="GrantVault address"
          aria-label="Existing GrantVault address"
          required
        />
        <input
          className="field"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          maxLength={1000}
        />
        <Button type="submit" variant="outline" disabled={linkGrant.isPending}>
          {linkGrant.isPending ? "Checking HSK…" : "Link grant"}
        </Button>
        {linkGrant.isError && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(linkGrant.error)}
          </p>
        )}
        {linkGrant.isSuccess && (
          <p className="text-sm text-primary">
            Grant metadata linked. The workspace list is up to date.
          </p>
        )}
      </form>
    </details>
  );
}

export function OrganizationOverview({
  organizationId,
}: {
  organizationId: string;
}) {
  const session = useSession();
  const organization = useOrganization(organizationId);
  const grants = useOrganizationGrants(organizationId);
  const members = useOrganizationMembers(organizationId);
  const stats = useOrganizationGrantStats(grants.data);
  if (!session.walletMatches) return null;
  if (organization.isPending || grants.isPending || members.isPending)
    return (
      <Notice title="Loading organization overview">
        <p>Reading workspace data and live HSK grant state…</p>
      </Notice>
    );
  if (organization.isError || grants.isError || members.isError)
    return (
      <Notice title="Organization overview is unavailable" error>
        <p>Retry the workspace or check the Supabase configuration.</p>
      </Notice>
    );
  const grantsData = grants.data ?? [];
  const organizationData = organization.data?.organization;
  if (!organizationData) return null;
  const metric = (value: number) =>
    stats.isPending || stats.hasError ? "—" : value.toString();
  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LiveMetric
          label="Members"
          value={organizationData.memberCount.toString()}
        />
        <LiveMetric label="Active grants" value={metric(stats.activeGrants)} />
        <LiveMetric
          label="Pending reviews for you"
          value={metric(stats.pendingReviews)}
        />
        <LiveMetric
          label="Claimable grants for you"
          value={metric(stats.claimableGrants)}
        />
      </div>
      {stats.hasError && (
        <p className="text-xs text-muted-foreground">
          Live grant metrics are temporarily unavailable; workspace metadata is
          still available.
        </p>
      )}
      <div className="grid items-start gap-7 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-7">
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Recent grants
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Onchain terms and live state, enriched with workspace context.
                </p>
              </div>
              <Link
                className="text-sm font-medium text-primary hover:underline"
                href={`/app/organizations/${organizationId}/grants`}
              >
                View all
              </Link>
            </div>
            {!grantsData.length ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-semibold">
                  No grants in this workspace yet.
                </p>
                <Link
                  className={`${buttonVariants()} mt-4`}
                  href={`/app/organizations/${organizationId}/grants/new`}
                >
                  Create the first grant
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {grantsData.slice(0, 4).map((grant) => (
                  <GrantCard
                    key={`${grant.chainId}:${grant.vaultAddress}`}
                    address={grant.vaultAddress as Address}
                    organization={organizationData}
                    metadata={grant}
                    members={members.data}
                  />
                ))}
              </div>
            )}
          </section>
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Review queue
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Only pending milestones for your actual onchain reviewer wallet
                appear here.
              </p>
            </div>
            {stats.isPending ? (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Reading live reviewer assignments…
              </p>
            ) : stats.hasError ? (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Live reviewer assignments are temporarily unavailable.
              </p>
            ) : stats.pendingReviews > 0 ? (
              grantsData.map((grant) => (
                <ReviewQueueItem
                  key={`review:${grant.vaultAddress}`}
                  grant={grant}
                  members={members.data}
                />
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No associated grants to review.
              </p>
            )}
          </section>
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Claimable for you
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Claimable amounts come from each GrantVault, never from
                Supabase.
              </p>
            </div>
            {stats.isPending ? (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Reading live beneficiary claimability…
              </p>
            ) : stats.hasError ? (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Live claimable amounts are temporarily unavailable.
              </p>
            ) : stats.claimableGrants > 0 ? (
              grantsData.map((grant) => (
                <ClaimableQueueItem
                  key={`claim:${grant.vaultAddress}`}
                  grant={grant}
                  members={members.data}
                />
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No claimable grants for this wallet.
              </p>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Members</CardTitle>
              <Link
                className="text-sm font-medium text-primary hover:underline"
                href={`/app/organizations/${organizationId}/members`}
              >
                Manage
              </Link>
            </CardHeader>
            <CardContent>
              <MembersPreview organizationId={organizationId} />
            </CardContent>
          </Card>
          {organization.data.membership.isOwner && (
            <LinkExistingGrant organizationId={organizationId} />
          )}
        </aside>
      </div>
    </div>
  );
}

export function OrganizationGrants({
  organizationId,
}: {
  organizationId: string;
}) {
  const session = useSession();
  const organization = useOrganization(organizationId);
  const grants = useOrganizationGrants(organizationId);
  const members = useOrganizationMembers(organizationId);
  if (!session.walletMatches) return null;
  if (organization.isPending || grants.isPending || members.isPending)
    return (
      <Notice title="Loading workspace grants">
        <p>Reading associated GrantVaults…</p>
      </Notice>
    );
  if (organization.isError || grants.isError || members.isError)
    return (
      <Notice title="Workspace grants are unavailable" error>
        <p>Retry after checking the workspace connection.</p>
      </Notice>
    );
  const data = organization.data?.organization;
  if (!data) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Organization grants
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {grants.data?.length ?? 0} associated GrantVaults.
          </p>
        </div>
        <Link
          className={buttonVariants()}
          href={`/app/organizations/${organizationId}/grants/new`}
        >
          Create grant +
        </Link>
      </div>
      {!grants.data?.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-lg font-semibold">
            No grants have been associated yet.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Create a grant from this workspace or link an existing GrantVault
            from the overview.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {grants.data.map((grant) => (
            <GrantCard
              key={`${grant.chainId}:${grant.vaultAddress}`}
              address={grant.vaultAddress as Address}
              organization={data}
              metadata={grant}
              members={members.data}
            />
          ))}
        </div>
      )}
    </div>
  );
}
