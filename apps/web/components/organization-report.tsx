"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

import { useOrganizationGrantSnapshots } from "@/hooks/use-organization-grant-snapshots";
import {
  useOrganization,
  useOrganizationGrants,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import {
  buildOrganizationReport,
  type OrganizationReport,
  type OrganizationReportTokenGroup,
  type OrganizationUpcomingUnlock,
} from "@/lib/dashboard/organization-report";
import {
  dateLabel,
  percent,
  shortAddress,
  tokenAmount,
} from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";

import { Notice, Progress } from "./grant-ui";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { MetricCard } from "./ui/metric-card";

/**
 * Every figure on this page is a live GrantVault read, labeled with the vault
 * field it came from and the single token it applies to. Supabase contributes
 * only the discovery set — which vaults this organization is associated with.
 */
function SourceNote({ children }: { children: string }) {
  return (
    <p className="mt-2 font-mono text-[11px] leading-4 text-muted-foreground">
      {children}
    </p>
  );
}

function Freshness({ report }: { report: OrganizationReport }) {
  const t = useTranslations();
  return (
    <p className="font-mono text-[11px] leading-4 text-muted-foreground">
      {report.readAt === null
        ? t("report.freshness.none")
        : t("report.freshness.readAt", {
            time: new Date(report.readAt).toLocaleTimeString(undefined, {
              timeStyle: "medium",
            }),
          })}
    </p>
  );
}

function PartialNotice({
  report,
  onRetry,
}: {
  report: OrganizationReport;
  onRetry: () => void;
}) {
  const t = useTranslations();
  if (!report.partial) return null;
  return (
    <div
      role="alert"
      className="rounded-card border border-[#E9832D]/40 bg-[rgba(233,131,45,.06)] p-5"
    >
      <p className="font-semibold text-[#E9832D]">
        {t("report.partial.title")}
      </p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {t("report.partial.body", {
          unreadable: report.unreadableVaults.length,
          associated: report.associatedGrants,
        })}
      </p>
      <ul className="mt-3 space-y-1">
        {report.unreadableVaults.map((vaultAddress) => (
          <li key={vaultAddress} className="font-mono text-xs">
            <Link
              className="text-primary hover:underline"
              href={`/grants/${vaultAddress}`}
            >
              {shortAddress(vaultAddress)}
            </Link>
          </li>
        ))}
      </ul>
      <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
        {t("report.partial.retry")}
      </Button>
    </div>
  );
}

function TokenGroupCard({ group }: { group: OrganizationReportTokenGroup }) {
  const t = useTranslations();
  const amount = (value: bigint) =>
    `${tokenAmount(value, group.decimals)} ${group.symbol}`;
  const rows: Array<[string, bigint, string]> = [
    [
      t("report.token.allocation"),
      group.totalAllocation,
      t("report.token.allocation.source"),
    ],
    [
      t("report.token.unlocked"),
      group.unlockedAmount,
      t("report.token.unlocked.source"),
    ],
    [
      t("report.token.unvested"),
      group.unvestedAmount,
      t("report.token.unvested.source"),
    ],
    [
      t("report.token.claimed"),
      group.claimedAmount,
      t("report.token.claimed.source"),
    ],
    [
      t("report.token.claimable"),
      group.claimableAmount,
      t("report.token.claimable.source"),
    ],
  ];
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">
          {t("report.token.title", { symbol: group.symbol })}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            group.grantCount === 1
              ? "report.token.count.one"
              : "report.token.count.other",
            { count: group.grantCount },
          )}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {shortAddress(group.token)}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress
          value={percent(group.unlockedAmount, group.totalAllocation)}
          label={t("report.token.unlockedShare")}
        />
        <dl className="space-y-3">
          {rows.map(([label, value, source]) => (
            <div key={label}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {amount(value)}
                </dd>
              </div>
              <SourceNote>{source}</SourceNote>
            </div>
          ))}
        </dl>
        <details className="rounded-card border border-border bg-surface-1 p-4">
          <summary className="cursor-pointer font-mono text-xs font-medium">
            {t("report.token.reconcile")}
          </summary>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {t("report.token.reconcileHint")}
          </p>
          <ul className="mt-3 space-y-1">
            {group.vaultAddresses.map((vaultAddress) => (
              <li key={vaultAddress}>
                <Link
                  className="font-mono text-xs text-primary hover:underline"
                  href={`/grants/${vaultAddress}`}
                >
                  {shortAddress(vaultAddress)}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}

function UpcomingUnlocks({
  unlocks,
}: {
  unlocks: OrganizationUpcomingUnlock[];
}) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("report.upcoming.title")}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {t("report.upcoming.lede")}
        </p>
      </CardHeader>
      <CardContent>
        {!unlocks.length ? (
          <p className="rounded-card border border-dashed border-border p-6 text-xs text-muted-foreground">
            {t("report.upcoming.empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {unlocks.map((unlock) => (
              <li
                key={`${unlock.vaultAddress}:${unlock.kind}`}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-soft pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <Link
                    className="font-medium hover:underline"
                    href={`/grants/${unlock.vaultAddress}`}
                  >
                    {unlock.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      unlock.kind === "cliff"
                        ? "report.upcoming.cliff"
                        : "report.upcoming.vestingEnd",
                    )}
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {dateLabel(BigInt(unlock.at))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <SourceNote>{t("report.upcoming.source")}</SourceNote>
      </CardContent>
    </Card>
  );
}

export function OrganizationReportView({
  organizationId,
}: {
  organizationId: string;
}) {
  const t = useTranslations();
  const session = useSession();
  const { address } = useAccount();
  const organization = useOrganization(organizationId);
  const grants = useOrganizationGrants(organizationId);
  const reads = useOrganizationGrantSnapshots(grants.data);
  if (!session.walletMatches) return null;
  if (organization.isPending || grants.isPending)
    return (
      <Notice title={t("report.loading.title")}>
        <p>{t("report.loading.body")}</p>
      </Notice>
    );
  if (organization.isError || grants.isError)
    return (
      <Notice title={t("report.error.title")} error>
        <p>{t("report.error.body")}</p>
      </Notice>
    );
  if (!grants.data?.length)
    return (
      <Notice title={t("report.empty.title")}>
        <p>{t("report.empty.body")}</p>
      </Notice>
    );
  if (reads.isPending && !reads.snapshots.length)
    return (
      <Notice title={t("report.reading.title")}>
        <p>{t("report.reading.body")}</p>
      </Notice>
    );
  const report = buildOrganizationReport({ wallet: address, reads });
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-[22px] font-normal tracking-tight">
            {t("report.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("report.lede")}
          </p>
        </div>
        <Freshness report={report} />
      </div>
      <PartialNotice report={report} onRetry={() => void reads.refetch()} />
      <section className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label={t("report.metric.active")}
            value={report.lifecycle.active.toString()}
            art="rings"
          />
          <MetricCard
            label={t("report.metric.completed")}
            value={report.lifecycle.completed.toString()}
            art="orb"
          />
          <MetricCard
            label={t("report.metric.revoked")}
            value={report.lifecycle.revoked.toString()}
            art="nodes"
          />
        </div>
        <SourceNote>{t("report.metric.lifecycle.source")}</SourceNote>
      </section>
      <section className="space-y-2">
        <h3 className="font-mono text-lg font-normal">
          {t("report.viewer.title")}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {t("report.viewer.lede")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label={t("report.metric.pendingReviews")}
            value={report.viewer.pendingReviews.toString()}
            art="mesh"
          />
          <MetricCard
            label={t("report.metric.claimable")}
            value={report.viewer.claimableGrants.toString()}
            art="rings"
          />
        </div>
        <SourceNote>{t("report.viewer.source")}</SourceNote>
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="font-mono text-lg font-normal">
            {t("report.tokens.title")}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("report.tokens.lede")}
          </p>
        </div>
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {report.tokenGroups.map((group) => (
            <TokenGroupCard key={group.token} group={group} />
          ))}
        </div>
      </section>
      <UpcomingUnlocks unlocks={report.upcomingUnlocks} />
    </div>
  );
}
