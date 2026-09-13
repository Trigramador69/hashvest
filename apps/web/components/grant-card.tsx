"use client";

import Link from "next/link";
import { zeroAddress, type Address } from "viem";
import { useAccount } from "wagmi";
import { hskTestnet } from "@hashvest/web3";

import { useGrant } from "@/hooks/use-grant";
import { findMemberByWallet } from "@/lib/cloud/members";
import { resolveProtocolRoles } from "@/lib/protocol/roles";
import { strategyKey } from "@/lib/shared/i18n/keys";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { appRoutes } from "@/lib/shared/routes";
import { errorMessage, percent, tokenAmount } from "@/lib/protocol/grants";
import type {
  OrganizationGrant,
  OrganizationMember,
} from "@/lib/cloud/organizations/types";
import { useGrantPresets } from "@/lib/shared/grant-presets/use-grant-presets";

import {
  AddressDisplay,
  FundingHealthSummary,
  GrantLifecycleBadge,
  Notice,
  Progress,
} from "./grant-ui";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { deriveGrantState } from "@/lib/protocol/grant-state";

const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

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
  const t = useTranslations();
  const { findPreset: localizedTemplate } = useGrantPresets();
  const { address: walletAddress } = useAccount();
  const grant = useGrant(address);
  if (grant.isPending)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("card.loading", { address: address.slice(0, 8) })}
        </CardContent>
      </Card>
    );
  if (!grant.data)
    return (
      <Notice title={t("card.error.title")} error>
        <AddressDisplay address={address} />
        <p>
          {errorMessage(grant.error, {
            fallback: t("ui.error.requestFailed"),
            rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
          })}
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => void grant.refetch()}
        >
          {t("card.retry")}
        </Button>
      </Notice>
    );
  if (grant.isRefetchError)
    return (
      <Notice title={t("card.stale.title")} error>
        <AddressDisplay address={address} />
        <p>{t("card.stale.body")}</p>
        <p className="mt-2 break-words">
          {errorMessage(grant.error, {
            fallback: t("ui.error.requestFailed"),
            rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
          })}
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => void grant.refetch()}
        >
          {t("card.retry")}
        </Button>
      </Notice>
    );
  const g = grant.data;
  const state = deriveGrantState({
    totalAllocation: g.totalAllocation,
    claimedAmount: g.claimedAmount,
    vaultBalance: g.balance,
    revoked: g.revoked,
  });
  const roles = resolveProtocolRoles(walletAddress, g);
  // Workspace metadata: which preset this grant started from. An unknown or
  // retired key simply shows nothing; the vault's own terms are above.
  const template = localizedTemplate(metadata?.templateKey);
  const pendingMilestones = g.milestones.filter(
    (item) => !item.approved,
  ).length;
  return (
    <Card className="flex flex-col transition-[background,border-color,transform] duration-180 hover:-translate-y-px hover:border-border-strong hover:bg-surface-hover">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-primary">
            <span className="size-1.5 rounded-full bg-current" />
            {t(strategyKey(g.strategy, "name"))}
          </span>
          <GrantLifecycleBadge lifecycle={state.lifecycle} />
        </div>
        <span className="mt-3 inline-flex w-fit border border-primary/20 bg-[rgba(87,217,139,.05)] px-2 py-1 font-mono text-[10px] text-muted-foreground">
          {g.revocable ? t("card.revocable") : t("card.nonRevocable")}
        </span>
        {organization && (
          <Link
            href={appRoutes.organization(organization.id)}
            className="pt-4 text-xs font-medium text-primary hover:underline"
          >
            {organization.name}
          </Link>
        )}
        <Link
          href={`/grants/${address}`}
          className="pt-3 font-mono text-[18px] font-normal leading-7 tracking-tight hover:text-primary"
        >
          {g.title} <span aria-hidden>↗</span>
        </Link>
        {metadata?.description && (
          <p className="pt-2 text-sm leading-6 text-muted-foreground">
            {metadata.description}
          </p>
        )}
        {template && (
          <p className="pt-2 text-xs text-muted-foreground">
            {t("card.fromTemplate", {
              template: template.name,
            })}
          </p>
        )}
        {roles.roles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3">
            {roles.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 font-mono text-[10px] text-primary"
              >
                <span className="size-1.5 rounded-full bg-current" />
                {t(`role.${role}`)}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex grow flex-col gap-5">
        <div>
          <p className="text-xs text-muted-foreground">
            {t("card.totalAllocation")}
          </p>
          <p className="mt-1 font-mono text-[28px] font-medium tabular-nums">
            {tokenAmount(g.totalAllocation, g.decimals)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {g.symbol}
            </span>
          </p>
        </div>
        <FundingHealthSummary
          funding={state.funding}
          totalAllocation={g.totalAllocation}
          vaultBalance={g.balance}
          decimals={g.decimals}
          symbol={g.symbol}
          compact
        />
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span>{t("card.unlocked")}</span>
            <span>{percent(g.unlockedAmount, g.totalAllocation)}%</span>
          </div>
          <Progress
            value={percent(g.unlockedAmount, g.totalAllocation)}
            label={t("card.unlockedProgress")}
          />
        </div>
        <div className="grid gap-4 border-t border-border-soft pt-4 sm:grid-cols-2">
          <ParticipantIdentity
            label={t("party.beneficiary")}
            address={g.beneficiary}
            members={members}
          />
          {g.reviewer !== zeroAddress && (
            <ParticipantIdentity
              label={t("party.reviewer")}
              address={g.reviewer}
              members={members}
            />
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <div className="text-xs text-muted-foreground">
            {pendingMilestones > 0 && roles.isReviewer && !g.revoked && (
              <span className="font-medium text-primary">
                {t(
                  pendingMilestones === 1
                    ? "card.milestonesToReview.one"
                    : "card.milestonesToReview.other",
                  { count: pendingMilestones },
                )}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {received ? t("card.availableToClaim") : t("card.claimable")}
            </p>
            <p className="mt-1 text-sm font-semibold text-primary">
              {tokenAmount(g.claimableAmount, g.decimals)} {g.symbol}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
