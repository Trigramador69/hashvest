"use client";

import Link from "next/link";
import { zeroAddress, type Address } from "viem";
import { useAccount } from "wagmi";

import { useGrant } from "@/hooks/use-grant";
import { findMemberByWallet } from "@/lib/cloud/members";
import { resolveProtocolRoles } from "@/lib/protocol/roles";
import type {
  OrganizationGrant,
  OrganizationMember,
} from "@/lib/cloud/organizations/types";
import {
  errorMessage,
  percent,
  strategies,
  tokenAmount,
} from "@/lib/protocol/grants";

import { AddressDisplay, Notice, Progress } from "./grant-ui";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

export type GrantCardProps = {
  address: Address;
  received?: boolean;
  organization?: {
    id: string;
    name: string;
  };
  metadata?: OrganizationGrant;
  members?: OrganizationMember[];
};

export function ParticipantIdentity({
  label,
  address,
  members,
}: {
  label?: string;
  address: Address;
  members?: OrganizationMember[];
}) {
  const member = findMemberByWallet(members, address);
  return (
    <div>
      {label && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
      {member ? (
        <>
          <p className="font-medium">{member.displayName}</p>
          {member.roleLabel && (
            <p className="text-xs text-muted-foreground">{member.roleLabel}</p>
          )}
          <AddressDisplay address={address} />
        </>
      ) : (
        <AddressDisplay address={address} />
      )}
    </div>
  );
}

export function GrantCard({
  address,
  received = false,
  organization,
  metadata,
  members,
}: GrantCardProps) {
  const { address: walletAddress } = useAccount();
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
  const roles = resolveProtocolRoles(walletAddress, g);
  const pendingMilestones = g.milestones.filter(
    (item) => !item.approved,
  ).length;
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
        {organization && (
          <Link
            href={`/app/organizations/${organization.id}`}
            className="pt-4 text-xs font-medium text-primary hover:underline"
          >
            {organization.name}
          </Link>
        )}
        <Link
          href={`/grants/${address}`}
          className="pt-3 text-xl font-semibold leading-7 tracking-tight hover:text-primary"
        >
          {g.title} <span aria-hidden>↗</span>
        </Link>
        {metadata?.description && (
          <p className="pt-2 text-sm leading-6 text-muted-foreground">
            {metadata.description}
          </p>
        )}
        {roles.roles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3">
            {roles.roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {role}
              </span>
            ))}
          </div>
        )}
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
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <ParticipantIdentity
            label="Beneficiary"
            address={g.beneficiary}
            members={members}
          />
          {g.reviewer !== zeroAddress && (
            <ParticipantIdentity
              label="Reviewer"
              address={g.reviewer}
              members={members}
            />
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <div className="text-xs text-muted-foreground">
            {pendingMilestones > 0 && roles.isReviewer && (
              <span className="font-medium text-primary">
                {pendingMilestones} milestone
                {pendingMilestones === 1 ? "" : "s"} to review
              </span>
            )}
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
