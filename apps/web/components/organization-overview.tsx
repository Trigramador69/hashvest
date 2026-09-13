"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { hskTestnet } from "@hashvest/web3";

import {
  useLinkOrganizationGrant,
  useOrganization,
  useOrganizationGrantEvidence,
  useOrganizationGrantStats,
  useOrganizationGrants,
  useOrganizationMembers,
  useOrganizationSponsorshipPolicy,
  useUpdateOrganizationSponsorshipPolicy,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { useGrant } from "@/hooks/use-grant";
import { errorMessage, tokenAmount } from "@/lib/protocol/grants";
import { findMemberByWallet } from "@/lib/cloud/members";
import { resolveProtocolRoles } from "@/lib/protocol/roles";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { appRoutes } from "@/lib/shared/routes";
import type {
  OrganizationGrant,
  OrganizationMember,
  SponsoredClaimPolicy,
} from "@/lib/cloud/organizations/types";

import { GrantCard } from "./grant-card";
import { OrganizationNotifications } from "./organization-notifications";
import { MilestoneEvidenceList } from "./milestone-evidence";
import { MembersPreview } from "./organization-ui";
import { Button, buttonVariants } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { MetricCard } from "./ui/metric-card";
import { FundingHealthSummary, GrantLifecycleBadge, Notice } from "./grant-ui";
import { deriveGrantState } from "@/lib/protocol/grant-state";
import { MAX_ORGANIZATION_SPONSORED_CLAIMS } from "@/lib/shared/sponsored-claims";

const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

function LiveMetric({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} art="rings" />;
}

function ReviewQueueItem({
  organizationId,
  grant,
  members,
}: {
  organizationId: string;
  grant: OrganizationGrant;
  members: OrganizationMember[] | undefined;
}) {
  const t = useTranslations();
  const { address } = useAccount();
  const live = useGrant(grant.vaultAddress as Address);
  const evidence = useOrganizationGrantEvidence(
    organizationId,
    grant.vaultAddress,
  );
  if (live.isPending)
    return (
      <p className="text-sm text-muted-foreground">
        {t("overview.review.item.loading")}
      </p>
    );
  if (live.isRefetchError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("overview.review.item.stale")}
      </p>
    );
  if (!live.data)
    return (
      <p role="alert" className="text-sm text-destructive">
        {errorMessage(live.error, {
          fallback: t("ui.error.requestFailed"),
          rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
        })}
      </p>
    );
  const state = deriveGrantState({
    totalAllocation: live.data.totalAllocation,
    claimedAmount: live.data.claimedAmount,
    vaultBalance: live.data.balance,
    revoked: live.data.revoked,
  });
  const roles = resolveProtocolRoles(address, live.data);
  const pending = live.data.milestones
    .map((milestone, index) => ({ milestone, index }))
    .filter(({ milestone }) => !milestone.approved);
  if (live.data.revoked || !roles.isReviewer || !pending.length) return null;
  const reviewer = findMemberByWallet(members, live.data.reviewer);
  const next = pending[0];
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="mb-2">
            <GrantLifecycleBadge lifecycle={state.lifecycle} />
          </div>
          <p className="font-semibold">{live.data.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              pending.length === 1
                ? "overview.review.item.pending.one"
                : "overview.review.item.pending.other",
              { count: pending.length },
            )}
            {reviewer
              ? ` · ${t("overview.review.item.reviewer", {
                  name: reviewer.displayName,
                })}`
              : ""}
          </p>
          <p className="mt-2 text-sm">
            {t("overview.review.item.next")}{" "}
            <strong>{next.milestone.title}</strong> ·{" "}
            {tokenAmount(next.milestone.amount, live.data.decimals)}{" "}
            {live.data.symbol}
          </p>
          <MilestoneEvidenceList
            evidence={evidence.data}
            isPending={evidence.isPending}
            isError={evidence.isError}
            onRetry={() => void evidence.refetch()}
            milestones={[{ index: next.index, title: next.milestone.title }]}
            members={members}
            compact
          />
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
          {t("overview.review.item.action")} <span aria-hidden>→</span>
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
  const t = useTranslations();
  const { address } = useAccount();
  const live = useGrant(grant.vaultAddress as Address);
  if (live.isPending)
    return (
      <p className="text-sm text-muted-foreground">
        {t("overview.claim.item.loading")}
      </p>
    );
  if (live.isRefetchError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("overview.claim.item.stale")}
      </p>
    );
  if (!live.data)
    return (
      <p role="alert" className="text-sm text-destructive">
        {errorMessage(live.error, {
          fallback: t("ui.error.requestFailed"),
          rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
        })}
      </p>
    );
  const state = deriveGrantState({
    totalAllocation: live.data.totalAllocation,
    claimedAmount: live.data.claimedAmount,
    vaultBalance: live.data.balance,
    revoked: live.data.revoked,
  });
  const roles = resolveProtocolRoles(address, live.data);
  if (!roles.isBeneficiary || live.data.claimableAmount === 0n) return null;
  const beneficiary = findMemberByWallet(members, live.data.beneficiary);
  return (
    <Card className="border-primary/30 bg-[rgba(87,217,139,.06)]">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="mb-2">
            <GrantLifecycleBadge lifecycle={state.lifecycle} />
          </div>
          <p className="font-semibold">{live.data.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {beneficiary?.displayName ?? t("party.beneficiary")} ·{" "}
            {grant.description ?? t("overview.claim.item.fallbackDescription")}
          </p>
          <p className="mt-2 font-semibold text-primary">
            {t("overview.claim.item.amount", {
              amount: `${tokenAmount(
                live.data.claimableAmount,
                live.data.decimals,
              )} ${live.data.symbol}`,
            })}
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
          {t("overview.claim.item.action")} <span aria-hidden>→</span>
        </Link>
      </CardContent>
    </Card>
  );
}

function LinkExistingGrant({ organizationId }: { organizationId: string }) {
  const t = useTranslations();
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
    <details className="rounded-card border border-border bg-surface-1 p-5">
      <summary className="cursor-pointer font-mono text-xs font-medium">
        {t("overview.link.summary")}
      </summary>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("overview.link.lede")}
      </p>
      <form className="mt-4 space-y-4" onSubmit={(event) => void submit(event)}>
        <input
          className="field font-mono"
          value={vaultAddress}
          onChange={(event) => setVaultAddress(event.target.value)}
          placeholder={t("overview.link.address.placeholder")}
          aria-label={t("overview.link.address.label")}
          required
        />
        <input
          className="field"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("overview.link.description.placeholder")}
          maxLength={1000}
        />
        <Button type="submit" variant="outline" disabled={linkGrant.isPending}>
          {linkGrant.isPending
            ? t("overview.link.pending")
            : t("overview.link.action")}
        </Button>
        {linkGrant.isError && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(linkGrant.error, {
              fallback: t("ui.error.requestFailed"),
              rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
            })}
          </p>
        )}
        {linkGrant.isSuccess && (
          <p className="text-sm text-primary">{t("overview.link.success")}</p>
        )}
      </form>
    </details>
  );
}

type SponsorshipPolicyData = SponsoredClaimPolicy & {
  relayerAddress: string | null;
  relayerConfigured: boolean;
};

function SponsorshipPolicyForm({
  organizationId,
  policy,
}: {
  organizationId: string;
  policy: SponsorshipPolicyData;
}) {
  const t = useTranslations();
  const update = useUpdateOrganizationSponsorshipPolicy(organizationId);
  const [enabled, setEnabled] = useState(policy.enabled);
  const [maxClaims, setMaxClaims] = useState(policy.maxClaims.toString());

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await update.mutateAsync({ enabled, maxClaims: Number(maxClaims) });
    } catch {
      // The localized status below is sufficient; the API keeps the raw cause server-side.
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void save(event)}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          checked={enabled}
          className="mt-1 size-4 rounded border-gray-300 text-primary focus:ring-primary"
          type="checkbox"
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium">
            {t("overview.sponsorship.enabled")}
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {t("overview.sponsorship.enabledHint")}
          </span>
        </span>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">
          {t("overview.sponsorship.maxClaims")}
        </span>
        <input
          className="field"
          inputMode="numeric"
          max={MAX_ORGANIZATION_SPONSORED_CLAIMS}
          min={0}
          type="number"
          value={maxClaims}
          onChange={(event) => setMaxClaims(event.target.value)}
        />
        <span className="block text-xs leading-5 text-muted-foreground">
          {t("overview.sponsorship.maxClaimsHint", {
            max: MAX_ORGANIZATION_SPONSORED_CLAIMS,
          })}
        </span>
      </label>
      <div className="space-y-1 rounded-card border border-border bg-surface-1 p-3 text-xs">
        <p>
          <span className="text-muted-foreground">
            {t("overview.sponsorship.usage")}:
          </span>{" "}
          {policy.usedClaims} / {policy.maxClaims}
        </p>
        <p>
          <span className="text-muted-foreground">
            {t("overview.sponsorship.remaining")}:
          </span>{" "}
          {policy.remainingClaims}
        </p>
        <p>
          <span className="text-muted-foreground">
            {t("overview.sponsorship.relayer")}:
          </span>{" "}
          {policy.relayerConfigured
            ? t("overview.sponsorship.relayerReady")
            : t("overview.sponsorship.relayerMissing")}
        </p>
      </div>
      {!policy.relayerConfigured && (
        <p className="text-xs leading-5 text-[#E9832D]">
          {t("overview.sponsorship.manualFallback")}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={update.isPending}>
        {update.isPending
          ? t("overview.sponsorship.saving")
          : t("overview.sponsorship.save")}
      </Button>
      {update.isError && (
        <p className="text-xs text-destructive" role="alert">
          {t("overview.sponsorship.updateError")}
        </p>
      )}
      {update.isSuccess && (
        <p className="text-xs text-primary">
          {t("overview.sponsorship.saved")}
        </p>
      )}
    </form>
  );
}

function SponsorshipPolicyCard({ organizationId }: { organizationId: string }) {
  const t = useTranslations();
  const policy = useOrganizationSponsorshipPolicy(organizationId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t("overview.sponsorship.title")}
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {t("overview.sponsorship.lede")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {policy.isPending ? (
          <p className="text-sm text-muted-foreground">
            {t("overview.sponsorship.loading")}
          </p>
        ) : policy.isError || !policy.data ? (
          <p className="text-sm text-destructive" role="alert">
            {t("overview.sponsorship.error")}
          </p>
        ) : (
          <SponsorshipPolicyForm
            organizationId={organizationId}
            policy={policy.data}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function OrganizationOverview({
  organizationId,
}: {
  organizationId: string;
}) {
  const t = useTranslations();
  const session = useSession();
  const organization = useOrganization(organizationId);
  const grants = useOrganizationGrants(organizationId);
  const members = useOrganizationMembers(organizationId);
  const stats = useOrganizationGrantStats(grants.data);
  if (!session.walletMatches) return null;
  if (organization.isPending || grants.isPending || members.isPending)
    return (
      <Notice title={t("overview.loading.title")}>
        <p>{t("overview.loading.body")}</p>
      </Notice>
    );
  if (organization.isError || grants.isError || members.isError)
    return (
      <Notice title={t("overview.error.title")} error>
        <p>{t("overview.error.body")}</p>
      </Notice>
    );
  const grantsData = grants.data ?? [];
  const organizationData = organization.data?.organization;
  if (!organizationData) return null;
  const metric = (value: number) =>
    stats.isPending || stats.hasError ? "—" : value.toString();
  return (
    <div className="space-y-7">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LiveMetric
          label={t("overview.metric.members")}
          value={organizationData.memberCount.toString()}
        />
        <LiveMetric
          label={t("overview.metric.activeGrants")}
          value={metric(stats.activeGrants)}
        />
        <LiveMetric
          label={t("overview.metric.pendingReviews")}
          value={metric(stats.pendingReviews)}
        />
        <LiveMetric
          label={t("overview.metric.claimableGrants")}
          value={metric(stats.claimableGrants)}
        />
      </div>
      {stats.hasError && (
        <p className="text-xs text-muted-foreground">
          {t("overview.metricsUnavailable")}
        </p>
      )}
      <div className="grid items-start gap-3 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-mono text-[22px] font-normal tracking-tight">
                  {t("overview.recent.title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("overview.recent.lede")}
                </p>
              </div>
              <Link
                className="text-sm font-medium text-primary hover:underline"
                href={appRoutes.organizationGrants(organizationId)}
              >
                {t("overview.recent.viewAll")}
              </Link>
            </div>
            {!grantsData.length ? (
              <div className="rounded-card border border-dashed border-border p-8 text-center">
                <p className="font-mono text-sm">
                  {t("overview.recent.empty")}
                </p>
                <Link
                  className={`${buttonVariants()} mt-4`}
                  href={appRoutes.organizationNewGrant(organizationId)}
                >
                  {t("overview.recent.createFirst")}
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
              <h2 className="font-mono text-[22px] font-normal tracking-tight">
                {t("overview.review.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("overview.review.lede")}
              </p>
            </div>
            {stats.isPending ? (
              <p className="rounded-card border border-dashed border-border p-6 text-xs text-muted-foreground">
                {t("overview.review.loading")}
              </p>
            ) : stats.hasError ? (
              <p className="rounded-card border border-dashed border-border p-6 text-xs text-muted-foreground">
                {t("overview.review.unavailable")}
              </p>
            ) : stats.pendingReviews > 0 ? (
              grantsData.map((grant) => (
                <ReviewQueueItem
                  key={`review:${grant.vaultAddress}`}
                  organizationId={organizationId}
                  grant={grant}
                  members={members.data}
                />
              ))
            ) : (
              <p className="rounded-card border border-dashed border-border p-6 text-xs text-muted-foreground">
                {t("overview.review.empty")}
              </p>
            )}
          </section>
          <section className="space-y-4">
            <div>
              <h2 className="font-mono text-[22px] font-normal tracking-tight">
                {t("overview.claim.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("overview.claim.lede")}
              </p>
            </div>
            {stats.isPending ? (
              <p className="rounded-card border border-dashed border-border p-6 text-xs text-muted-foreground">
                {t("overview.claim.loading")}
              </p>
            ) : stats.hasError ? (
              <p className="rounded-card border border-dashed border-border p-6 text-xs text-muted-foreground">
                {t("overview.claim.unavailable")}
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
              <p className="rounded-card border border-dashed border-border p-6 text-xs text-muted-foreground">
                {t("overview.claim.empty")}
              </p>
            )}
          </section>
        </div>
        <aside className="space-y-3 lg:col-span-4">
          <OrganizationNotifications organizationId={organizationId} />
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">
                {t("overview.members.title")}
              </CardTitle>
              <Link
                className="text-sm font-medium text-primary hover:underline"
                href={appRoutes.organizationMembers(organizationId)}
              >
                {t("overview.members.manage")}
              </Link>
            </CardHeader>
            <CardContent>
              <MembersPreview organizationId={organizationId} />
            </CardContent>
          </Card>
          {organization.data.membership.isOwner && (
            <>
              <SponsorshipPolicyCard organizationId={organizationId} />
              <LinkExistingGrant organizationId={organizationId} />
            </>
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
  const t = useTranslations();
  const session = useSession();
  const organization = useOrganization(organizationId);
  const grants = useOrganizationGrants(organizationId);
  const members = useOrganizationMembers(organizationId);
  if (!session.walletMatches) return null;
  if (organization.isPending || grants.isPending || members.isPending)
    return (
      <Notice title={t("orggrants.loading.title")}>
        <p>{t("orggrants.loading.body")}</p>
      </Notice>
    );
  if (organization.isError || grants.isError || members.isError)
    return (
      <Notice title={t("orggrants.error.title")} error>
        <p>{t("orggrants.error.body")}</p>
      </Notice>
    );
  const data = organization.data?.organization;
  if (!data) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-[22px] font-normal tracking-tight">
            {t("orggrants.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              (grants.data?.length ?? 0) === 1
                ? "orggrants.count.one"
                : "orggrants.count.other",
              { count: grants.data?.length ?? 0 },
            )}
          </p>
        </div>
        <Link
          className={buttonVariants()}
          href={appRoutes.organizationNewGrant(organizationId)}
        >
          {t("orggrants.create")} <span aria-hidden>+</span>
        </Link>
      </div>
      {!grants.data?.length ? (
        <div className="rounded-card border border-dashed border-border p-12 text-center">
          <p className="font-mono text-lg">{t("orggrants.empty.title")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {t("orggrants.empty.body")}
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
