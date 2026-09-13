"use client";

import Link from "next/link";
import { useId } from "react";
import { CheckCircle2, Coins, Flag, RotateCcw } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { DataArt } from "@/components/ui/data-art";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  type DashboardActivityBucket,
  type DashboardAnalytics,
  type DashboardChainEvent,
  type DashboardGrant,
  type DashboardStrategy,
} from "@/lib/dashboard/analytics";
import { shortAddress } from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";
import type { Translator } from "@/lib/shared/i18n/dictionary";
import { appRoutes } from "@/lib/shared/routes";
import { cn } from "@/lib/shared/utils";

function eventIcon(kind: DashboardChainEvent["kind"]) {
  if (kind === "created")
    return <Flag className="size-3.5" strokeWidth={1.25} />;
  if (kind === "approved")
    return <CheckCircle2 className="size-3.5" strokeWidth={1.25} />;
  if (kind === "claimed")
    return <Coins className="size-3.5" strokeWidth={1.25} />;
  return <RotateCcw className="size-3.5" strokeWidth={1.25} />;
}

function eventLabel(kind: DashboardChainEvent["kind"], t: Translator) {
  if (kind === "created") return t("dashboard.event.created");
  if (kind === "approved") return t("dashboard.event.approved");
  if (kind === "claimed") return t("dashboard.event.claimed");
  return t("dashboard.event.revoked");
}

function strategyText(strategy: DashboardStrategy, t: Translator) {
  if (strategy === "MILESTONE") return t("strategy.1.name");
  if (strategy === "HYBRID") return t("strategy.2.name");
  return t("strategy.0.name");
}

function eventTone(kind: DashboardChainEvent["kind"]) {
  if (kind === "revoked") return "text-[#E9832D] bg-[rgba(233,131,45,.12)]";
  if (kind === "claimed") return "text-[#4D6AD9] bg-[rgba(77,106,217,.12)]";
  return "text-primary bg-[rgba(87,217,139,.12)]";
}

function relativeTime(timestamp: number | null, t: Translator) {
  if (!timestamp) return "—";
  const delta = Math.max(0, Date.now() - timestamp * 1000);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return t("dashboard.time.now");
  if (minutes < 60) return t("dashboard.time.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("dashboard.time.hours", { count: hours });
  return t("dashboard.time.days", { count: Math.floor(hours / 24) });
}

function DotBarChart({
  data,
  t,
}: {
  data: DashboardActivityBucket[];
  t: Translator;
}) {
  const summaryId = useId();
  const chartConfig = {
    created: {
      label: t("dashboard.chart.series.created"),
      color: "var(--chart-series-1)",
    },
    approved: {
      label: t("dashboard.chart.series.approved"),
      color: "var(--chart-series-2)",
    },
    claimed: {
      label: t("dashboard.chart.series.claimed"),
      color: "var(--chart-series-3)",
    },
    revoked: {
      label: t("dashboard.chart.series.revoked"),
      color: "var(--chart-series-4)",
    },
  } satisfies ChartConfig;

  return (
    <div>
      <div className="overflow-x-auto">
        <ChartContainer
          config={chartConfig}
          className="h-[250px] min-h-[250px] min-w-[320px]"
          aria-describedby={summaryId}
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(245,245,241,.07)"
              strokeDasharray="2 3"
              vertical
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={18}
              tick={{ fill: "#747672", fontFamily: "monospace", fontSize: 10 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              domain={[0, "auto"]}
              tickLine={false}
              tick={{ fill: "#747672", fontFamily: "monospace", fontSize: 10 }}
              tickCount={4}
              width={24}
            />
            <ChartTooltip
              cursor={{
                stroke: "rgba(245,245,241,.16)",
                strokeDasharray: "2 3",
              }}
              content={<ChartTooltipContent />}
            />
            <ChartLegend
              align="left"
              content={
                <ChartLegendContent className="justify-start gap-x-4 gap-y-2 pb-3 pt-0" />
              }
              itemSorter={null}
              verticalAlign="top"
            />
            <Line
              dataKey="created"
              dot={{ r: 2, strokeWidth: 0 }}
              isAnimationActive={false}
              name={chartConfig.created.label as string}
              stroke="var(--color-created)"
              strokeLinecap="round"
              strokeWidth={1.5}
              type="linear"
            />
            <Line
              dataKey="approved"
              dot={{ r: 2, strokeWidth: 0 }}
              isAnimationActive={false}
              name={chartConfig.approved.label as string}
              stroke="var(--color-approved)"
              strokeLinecap="round"
              strokeWidth={1.5}
              type="linear"
            />
            <Line
              dataKey="claimed"
              dot={{ r: 2, strokeWidth: 0 }}
              isAnimationActive={false}
              name={chartConfig.claimed.label as string}
              stroke="var(--color-claimed)"
              strokeLinecap="round"
              strokeWidth={1.5}
              type="linear"
            />
            <Line
              dataKey="revoked"
              dot={{ r: 2, strokeWidth: 0 }}
              isAnimationActive={false}
              name={chartConfig.revoked.label as string}
              stroke="var(--color-revoked)"
              strokeLinecap="round"
              strokeWidth={1.5}
              type="linear"
            />
          </LineChart>
        </ChartContainer>
      </div>
      <div className="sr-only">
        <p id={summaryId}>{t("dashboard.chart.activity.sr")}</p>
        <table>
          <caption>{t("dashboard.chart.activity.aria")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("dashboard.chart.activity.period")}</th>
              <th scope="col">{t("dashboard.chart.series.created")}</th>
              <th scope="col">{t("dashboard.chart.series.approved")}</th>
              <th scope="col">{t("dashboard.chart.series.claimed")}</th>
              <th scope="col">{t("dashboard.chart.series.revoked")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.key}>
                <th scope="row">{item.label}</th>
                <td>{item.created}</td>
                <td>{item.approved}</td>
                <td>{item.claimed}</td>
                <td>{item.revoked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DonutChart({
  data,
  t,
}: {
  data: DashboardAnalytics["strategyDistribution"];
  t: Translator;
}) {
  const colors = [
    "var(--chart-series-1)",
    "var(--chart-series-2)",
    "var(--chart-series-3)",
  ];
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const chartConfig = {
    TIME: { label: strategyText("TIME", t), color: colors[0] },
    MILESTONE: { label: strategyText("MILESTONE", t), color: colors[1] },
    HYBRID: { label: strategyText("HYBRID", t), color: colors[2] },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:items-center">
      <div className="relative size-40 shrink-0">
        <ChartContainer
          config={chartConfig}
          className="size-full min-h-0"
          role="img"
          aria-label={t("dashboard.chart.strategy.aria")}
        >
          <PieChart accessibilityLayer>
            <Pie
              data={[{ strategy: "background", count: 1 }]}
              dataKey="count"
              endAngle={-270}
              fill="var(--chart-series-muted)"
              isAnimationActive={false}
              innerRadius={51}
              outerRadius={67}
              startAngle={90}
              strokeWidth={0}
            />
            {total > 0 && (
              <Pie
                data={data}
                dataKey="count"
                endAngle={-270}
                innerRadius={51}
                isAnimationActive={false}
                nameKey="strategy"
                outerRadius={67}
                paddingAngle={1}
                startAngle={90}
                strokeWidth={0}
              >
                {data.map((item, index) => (
                  <Cell key={item.strategy} fill={colors[index]} />
                ))}
              </Pie>
            )}
            {total > 0 && (
              <ChartTooltip
                content={<ChartTooltipContent hideLabel nameKey="strategy" />}
              />
            )}
          </PieChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl tabular-nums text-foreground">
            {total}
          </span>
          <span className="mt-2 font-mono text-[9px] text-muted-foreground">
            {t("dashboard.chart.strategy.grants")}
          </span>
        </div>
      </div>
      <div className="w-full max-w-[17rem] min-w-0 space-y-3 sm:flex-1">
        {data.map((item, index) => (
          <div
            key={item.strategy}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 text-xs"
          >
            <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ background: colors[index] }}
              />
              <span className="truncate">{strategyText(item.strategy, t)}</span>
            </span>
            <span className="text-right font-mono text-[11px] tabular-nums text-foreground">
              {total ? Math.round((item.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusTone(grant: DashboardGrant) {
  if (grant.lifecycle === "REVOKED") return "text-[#E9832D]";
  if (grant.lifecycle === "COMPLETED") return "text-[#4D6AD9]";
  return "text-primary";
}

function statusLabel(grant: DashboardGrant, t: Translator) {
  if (grant.lifecycle === "REVOKED") return t("dashboard.status.revoked");
  if (grant.lifecycle === "COMPLETED") return t("dashboard.status.completed");
  return t("dashboard.status.active");
}

function roleLabel(role: DashboardGrant["roles"][number], t: Translator) {
  if (role === "issuer") return t("dashboard.role.issuer");
  if (role === "beneficiary") return t("dashboard.role.beneficiary");
  return t("dashboard.role.reviewer");
}

function GrantTable({
  grants,
  t,
}: {
  grants: DashboardGrant[];
  t: Translator;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left">
        <caption className="sr-only">{t("dashboard.table.caption")}</caption>
        <thead className="font-mono text-[10px] text-muted-foreground">
          <tr>
            <th className="px-2 pb-3 font-normal">
              {t("dashboard.table.grant")}
            </th>
            <th className="px-2 pb-3 font-normal">
              {t("dashboard.table.role")}
            </th>
            <th className="px-2 pb-3 font-normal">
              {t("dashboard.table.status")}
            </th>
            <th className="px-2 pb-3 font-normal">
              {t("dashboard.table.claimed")}
            </th>
            <th className="px-2 pb-3 text-right font-normal">
              {t("dashboard.table.updated")}
            </th>
          </tr>
        </thead>
        <tbody>
          {grants.slice(0, 5).map((grant) => (
            <tr
              key={grant.vaultAddress}
              className="border-t border-border-soft text-xs"
            >
              <td className="max-w-[220px] px-2 py-3">
                <Link
                  href={`/grants/${grant.vaultAddress}`}
                  className="block truncate font-mono text-foreground hover:text-primary"
                >
                  {grant.title || shortAddress(grant.vaultAddress)}
                </Link>
                {grant.organizationName && (
                  <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                    {grant.organizationName}
                  </span>
                )}
              </td>
              <td className="px-2 py-3 text-muted-foreground">
                {grant.roles.map((role) => roleLabel(role, t)).join(" · ") ||
                  "—"}
              </td>
              <td className={cn("px-2 py-3", statusTone(grant))}>
                <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />
                {statusLabel(grant, t)}
              </td>
              <td className="px-2 py-3 font-mono tabular-nums text-muted-foreground">
                {grant.claimedPercent.toFixed(1)}%
              </td>
              <td className="px-2 py-3 text-right font-mono text-[10px] text-muted-foreground">
                {relativeTime(grant.lastActivityAt, t)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!grants.length && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          {t("dashboard.table.empty")}
        </p>
      )}
    </div>
  );
}

function ActivityList({
  events,
  t,
}: {
  events: DashboardChainEvent[];
  t: Translator;
}) {
  return (
    <div>
      {events.slice(0, 5).map((event) => (
        <div
          key={event.id}
          className="flex min-h-[62px] items-center gap-3 border-t border-border-soft py-3"
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full ${eventTone(event.kind)}`}
          >
            {eventIcon(event.kind)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-foreground">
              {eventLabel(event.kind, t)}
            </p>
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              {shortAddress(event.vaultAddress)}
            </p>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {relativeTime(event.timestamp, t)}
          </span>
        </div>
      ))}
      {!events.length && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          {t("dashboard.activity.empty")}
        </p>
      )}
    </div>
  );
}

export function DashboardOverview({
  analytics,
  organizationCount,
  connected,
}: {
  analytics: {
    data?: DashboardAnalytics;
    status: "idle" | "loading" | "partial" | "success" | "error";
    refetch: () => unknown;
  };
  organizationCount: number;
  connected: boolean;
}) {
  const t = useTranslations();
  const data = analytics.data;
  if (!connected)
    return (
      <Panel className="dashboard-reveal relative min-h-[150px] overflow-hidden p-6">
        <div className="relative z-10 max-w-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary">
            {t("dashboard.connect.eyebrow")}
          </p>
          <h2 className="mt-3 font-mono text-2xl font-normal text-foreground">
            {t("dashboard.connect.title")}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {t("dashboard.connect.body")}
          </p>
        </div>
        <DataArt
          variant="orb"
          className="absolute -right-2 top-4 h-36 w-56 opacity-60"
        />
      </Panel>
    );
  if (analytics.status === "loading" || analytics.status === "idle")
    return (
      <p className="rounded-card border border-dashed border-border p-6 font-mono text-xs text-muted-foreground">
        {t("dashboard.analytics.loading")}
      </p>
    );
  if (analytics.status === "error")
    return (
      <p className="rounded-card border border-dashed border-[#E9832D]/40 p-6 font-mono text-xs text-[#E9832D]">
        {t("dashboard.analytics.error")}
      </p>
    );
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="dashboard-reveal-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("dashboard.metric.active")}
          value={data.activeGrants}
          trend={data.activeGrants ? t("dashboard.metric.live") : "—"}
          comparison={t("dashboard.metric.onchain")}
          art="rings"
        />
        <MetricCard
          href={appRoutes.organizations}
          label={t("dashboard.metric.organizations")}
          value={organizationCount}
          trend={organizationCount ? t("dashboard.metric.synced") : "—"}
          comparison={t("dashboard.metric.context")}
          art="nodes"
        />
        <MetricCard
          label={t("dashboard.metric.pendingReviews")}
          value={data.pendingReviews}
          trend={
            data.pendingReviews
              ? t("dashboard.metric.action")
              : t("dashboard.metric.clear")
          }
          comparison={t("dashboard.metric.forYou")}
          trendTone={data.pendingReviews ? "warning" : "positive"}
          art="mesh"
        />
        <MetricCard
          label={t("dashboard.metric.claimable")}
          value={data.claimableGrants}
          trend={
            data.claimableGrants
              ? t("dashboard.metric.ready")
              : t("dashboard.metric.none")
          }
          comparison={t("dashboard.metric.forYou")}
          art="orb"
        />
      </div>
      {data.partial && (
        <p className="font-mono text-[10px] text-[#E9832D]">
          {t("dashboard.analytics.partial")}
        </p>
      )}
      <div className="dashboard-reveal-stagger grid gap-3 xl:grid-cols-12">
        <Panel className="xl:col-span-8">
          <PanelHeader
            title={t("dashboard.chart.activity.title")}
            description={t("dashboard.chart.activity.lede")}
          />
          <PanelBody>
            <DotBarChart data={data.activity} t={t} />
          </PanelBody>
        </Panel>
        <Panel className="xl:col-span-4">
          <PanelHeader
            title={t("dashboard.chart.strategy.title")}
            description={t("dashboard.chart.strategy.lede")}
          />
          <PanelBody>
            <DonutChart data={data.strategyDistribution} t={t} />
          </PanelBody>
        </Panel>
      </div>
      <div className="dashboard-reveal-stagger grid gap-3 xl:grid-cols-12">
        <Panel className="xl:col-span-5">
          <PanelHeader
            title={t("dashboard.chart.top.title")}
            description={t("dashboard.chart.top.lede")}
            action={
              <Link
                href={appRoutes.grants}
                className="font-mono text-[10px] text-primary hover:underline"
              >
                {t("dashboard.chart.top.viewAll")}
              </Link>
            }
          />
          <PanelBody className="px-3">
            <GrantTable grants={data.grants} t={t} />
          </PanelBody>
        </Panel>
        <Panel className="xl:col-span-4">
          <PanelHeader
            title={t("dashboard.chart.progress.title")}
            description={t("dashboard.chart.progress.lede")}
          />
          <PanelBody className="space-y-4">
            {data.grants.slice(0, 4).map((grant) => (
              <Link
                key={grant.vaultAddress}
                href={`/grants/${grant.vaultAddress}`}
                className="block space-y-2 rounded-control py-1 hover:bg-surface-2"
              >
                <div className="flex justify-between gap-3 text-xs">
                  <span className="truncate text-foreground">
                    {grant.title || shortAddress(grant.vaultAddress)}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {grant.claimedPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2C2B]">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, grant.claimedPercent)}%` }}
                  />
                </div>
              </Link>
            ))}
            {!data.grants.length && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {t("dashboard.chart.progress.empty")}
              </p>
            )}
          </PanelBody>
        </Panel>
        <Panel className="xl:col-span-3">
          <PanelHeader
            title={t("dashboard.chart.recent.title")}
            action={
              <span className="font-mono text-[10px] text-muted-foreground">
                {t("dashboard.chart.recent.live")}
              </span>
            }
          />
          <PanelBody className="px-4">
            <ActivityList events={data.events} t={t} />
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
