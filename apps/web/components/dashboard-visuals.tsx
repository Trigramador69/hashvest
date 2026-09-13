"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Flag,
  RotateCcw,
} from "lucide-react";

import { DataArt } from "@/components/ui/data-art";
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

function eventIcon(kind: DashboardChainEvent["kind"]) {
  if (kind === "created") return <Flag className="size-3.5" strokeWidth={1.25} />;
  if (kind === "approved") return <CheckCircle2 className="size-3.5" strokeWidth={1.25} />;
  if (kind === "claimed") return <Coins className="size-3.5" strokeWidth={1.25} />;
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

function DotBarChart({ data, t }: { data: DashboardActivityBucket[]; t: Translator }) {
  const width = 640;
  const height = 230;
  const chartTop = 16;
  const chartBottom = 182;
  const max = Math.max(4, ...data.map((item) => item.created + item.approved + item.claimed + item.revoked));
  const x = (index: number) => 44 + (index * (width - 76)) / Math.max(1, data.length - 1);
  const y = (value: number) => chartBottom - (value / max) * (chartBottom - chartTop);
  const series = [
    { key: "created" as const, color: "#57D98B", label: t("dashboard.chart.series.created") },
    { key: "approved" as const, color: "#4D6AD9", label: t("dashboard.chart.series.approved") },
    { key: "claimed" as const, color: "#D8D9D5", label: t("dashboard.chart.series.claimed") },
    { key: "revoked" as const, color: "#E9832D", label: t("dashboard.chart.series.revoked") },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] text-muted-foreground">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={t("dashboard.chart.activity.aria")}>
        {[0, 1, 2, 3].map((step) => {
          const value = Math.round((max * step) / 3);
          return (
            <g key={step}>
              <line x1="44" x2={width - 24} y1={y(value)} y2={y(value)} stroke="rgba(245,245,241,.07)" strokeDasharray="2 3" />
              <text x="4" y={y(value) + 3} fill="#747672" fontSize="10" fontFamily="monospace">{value}</text>
            </g>
          );
        })}
        {data.map((item, index) => (
          <g key={item.key}>
            <line x1={x(index)} x2={x(index)} y1={chartTop} y2={chartBottom} stroke="rgba(245,245,241,.04)" strokeDasharray="2 3" />
            <text x={x(index)} y="210" textAnchor="middle" fill="#747672" fontSize="10" fontFamily="monospace">{item.label}</text>
            {series.map((itemSeries, seriesIndex) => {
              const value = item[itemSeries.key];
              return Array.from({ length: value }, (_, pointIndex) => (
                <circle key={`${itemSeries.key}-${pointIndex}`} cx={x(index) + (seriesIndex - 1.5) * 3} cy={y(pointIndex + 1)} r="1.5" fill={itemSeries.color} fillOpacity=".9" />
              ));
            })}
          </g>
        ))}
      </svg>
      <p className="sr-only">{t("dashboard.chart.activity.sr")}</p>
    </div>
  );
}

function DonutChart({ data, t }: { data: DashboardAnalytics["strategyDistribution"]; t: Translator }) {
  const colors = ["#57D98B", "#4D6AD9", "#D8D9D5"];
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={t("dashboard.chart.strategy.aria")}>
          <circle cx="60" cy="60" r={radius} stroke="#202322" strokeWidth="12" fill="none" />
          {total > 0 && data.map((item, index) => {
            const length = (item.count / total) * circumference;
            const circle = (
              <circle key={item.strategy} cx="60" cy="60" r={radius} stroke={colors[index]} strokeWidth="12" fill="none" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <span className="font-mono text-lg tabular-nums text-foreground">{total}</span>
          <span className="-mt-8 font-mono text-[9px] text-muted-foreground">{t("dashboard.chart.strategy.grants")}</span>
        </div>
      </div>
      <div className="min-w-0 space-y-3">
        {data.map((item, index) => (
          <div key={item.strategy} className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: colors[index] }} />
              <span className="truncate">{strategyText(item.strategy, t)}</span>
            </span>
            <span className="font-mono text-[11px] text-foreground">{total ? Math.round((item.count / total) * 100) : 0}%</span>
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

function GrantTable({ grants, t }: { grants: DashboardGrant[]; t: Translator }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left">
        <caption className="sr-only">{t("dashboard.table.caption")}</caption>
        <thead className="font-mono text-[10px] text-muted-foreground">
          <tr>
            <th className="px-2 pb-3 font-normal">{t("dashboard.table.grant")}</th>
            <th className="px-2 pb-3 font-normal">{t("dashboard.table.role")}</th>
            <th className="px-2 pb-3 font-normal">{t("dashboard.table.status")}</th>
            <th className="px-2 pb-3 font-normal">{t("dashboard.table.claimed")}</th>
            <th className="px-2 pb-3 text-right font-normal">{t("dashboard.table.updated")}</th>
          </tr>
        </thead>
        <tbody>
          {grants.slice(0, 5).map((grant) => (
            <tr key={grant.vaultAddress} className="border-t border-border-soft text-xs">
              <td className="max-w-[220px] px-2 py-3">
                <Link href={`/grants/${grant.vaultAddress}`} className="block truncate font-mono text-foreground hover:text-primary">
                  {grant.title || shortAddress(grant.vaultAddress)}
                </Link>
                {grant.organizationName && <span className="mt-1 block truncate text-[10px] text-muted-foreground">{grant.organizationName}</span>}
              </td>
              <td className="px-2 py-3 text-muted-foreground">{grant.roles.map((role) => roleLabel(role, t)).join(" · ") || "—"}</td>
              <td className={cn("px-2 py-3", statusTone(grant))}><span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />{statusLabel(grant, t)}</td>
              <td className="px-2 py-3 font-mono tabular-nums text-muted-foreground">{grant.claimedPercent.toFixed(1)}%</td>
              <td className="px-2 py-3 text-right font-mono text-[10px] text-muted-foreground">{relativeTime(grant.lastActivityAt, t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!grants.length && <p className="py-8 text-center text-xs text-muted-foreground">{t("dashboard.table.empty")}</p>}
    </div>
  );
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ActivityList({ events, t }: { events: DashboardChainEvent[]; t: Translator }) {
  return (
    <div>
      {events.slice(0, 5).map((event) => (
        <div key={event.id} className="flex min-h-[62px] items-center gap-3 border-t border-border-soft py-3">
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${eventTone(event.kind)}`}>
            {eventIcon(event.kind)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-foreground">{eventLabel(event.kind, t)}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{shortAddress(event.vaultAddress)}</p>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{relativeTime(event.timestamp, t)}</span>
        </div>
      ))}
      {!events.length && <p className="py-8 text-center text-xs text-muted-foreground">{t("dashboard.activity.empty")}</p>}
    </div>
  );
}

export function DashboardOverview({
  analytics,
  organizationCount,
  connected,
}: {
  analytics: { data?: DashboardAnalytics; status: "idle" | "loading" | "partial" | "success" | "error"; refetch: () => unknown };
  organizationCount: number;
  connected: boolean;
}) {
  const t = useTranslations();
  const data = analytics.data;
  if (!connected)
    return (
      <Panel className="relative min-h-[150px] overflow-hidden p-6">
        <div className="relative z-10 max-w-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary">{t("dashboard.connect.eyebrow")}</p>
          <h2 className="mt-3 font-mono text-2xl font-normal text-foreground">{t("dashboard.connect.title")}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("dashboard.connect.body")}</p>
        </div>
        <DataArt variant="orb" className="absolute -right-2 top-4 h-36 w-56 opacity-60" />
      </Panel>
    );
  if (analytics.status === "loading" || analytics.status === "idle")
    return <p className="rounded-card border border-dashed border-border p-6 font-mono text-xs text-muted-foreground">{t("dashboard.analytics.loading")}</p>;
  if (analytics.status === "error")
    return <p className="rounded-card border border-dashed border-[#E9832D]/40 p-6 font-mono text-xs text-[#E9832D]">{t("dashboard.analytics.error")}</p>;
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("dashboard.metric.active")} value={data.activeGrants} trend={data.activeGrants ? t("dashboard.metric.live") : "—"} comparison={t("dashboard.metric.onchain")} art="rings" />
        <MetricCard label={t("dashboard.metric.workspaces")} value={organizationCount} trend={organizationCount ? t("dashboard.metric.synced") : "—"} comparison={t("dashboard.metric.context")} art="nodes" />
        <MetricCard label={t("dashboard.metric.pendingReviews")} value={data.pendingReviews} trend={data.pendingReviews ? t("dashboard.metric.action") : t("dashboard.metric.clear")} comparison={t("dashboard.metric.forYou")} trendTone={data.pendingReviews ? "warning" : "positive"} art="mesh" />
        <MetricCard label={t("dashboard.metric.claimable")} value={data.claimableGrants} trend={data.claimableGrants ? t("dashboard.metric.ready") : t("dashboard.metric.none")} comparison={t("dashboard.metric.forYou")} art="orb" />
      </div>
      {data.partial && <p className="font-mono text-[10px] text-[#E9832D]">{t("dashboard.analytics.partial")}</p>}
      <div className="grid gap-3 xl:grid-cols-12">
        <Panel className="xl:col-span-5">
          <PanelHeader title={t("dashboard.chart.activity.title")} description={t("dashboard.chart.activity.lede")} />
          <PanelBody><DotBarChart data={data.activity} t={t} /></PanelBody>
        </Panel>
        <Panel className="xl:col-span-3">
          <PanelHeader title={t("dashboard.chart.strategy.title")} description={t("dashboard.chart.strategy.lede")} />
          <PanelBody><DonutChart data={data.strategyDistribution} t={t} /></PanelBody>
        </Panel>
        <Panel className="relative overflow-hidden bg-[#07110C] xl:col-span-4">
          <PanelBody className="relative z-10 flex min-h-[250px] flex-col justify-between">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary">{t("dashboard.chart.next.eyebrow")}</p><h2 className="mt-6 max-w-[220px] font-mono text-2xl font-normal leading-tight text-foreground">{t("dashboard.chart.next.title")}</h2><p className="mt-3 max-w-[230px] text-xs leading-5 text-muted-foreground">{t("dashboard.chart.next.body")}</p></div>
            <Link href="/grants/new" aria-label={t("dashboard.chart.next.cta")} className="grid size-9 place-items-center rounded-full border border-border-strong text-foreground hover:bg-surface-2"><ArrowUpRight className="size-4" strokeWidth={1.25} /></Link>
          </PanelBody>
          <DataArt variant="orb" className="absolute -right-14 -top-4 h-52 w-64 opacity-55" />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-12">
        <Panel className="xl:col-span-5">
          <PanelHeader title={t("dashboard.chart.top.title")} description={t("dashboard.chart.top.lede")} action={<Link href="/app" className="font-mono text-[10px] text-primary hover:underline">{t("dashboard.chart.top.viewAll")}</Link>} />
          <PanelBody className="px-3"><GrantTable grants={data.grants} t={t} /></PanelBody>
        </Panel>
        <Panel className="xl:col-span-4">
          <PanelHeader title={t("dashboard.chart.progress.title")} description={t("dashboard.chart.progress.lede")} />
          <PanelBody className="space-y-4">
            {data.grants.slice(0, 4).map((grant) => (
              <Link key={grant.vaultAddress} href={`/grants/${grant.vaultAddress}`} className="block space-y-2 rounded-control py-1 hover:bg-surface-2">
                <div className="flex justify-between gap-3 text-xs"><span className="truncate text-foreground">{grant.title || shortAddress(grant.vaultAddress)}</span><span className="font-mono text-[10px] text-muted-foreground">{grant.claimedPercent.toFixed(1)}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2C2B]"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, grant.claimedPercent)}%` }} /></div>
              </Link>
            ))}
            {!data.grants.length && <p className="py-8 text-center text-xs text-muted-foreground">{t("dashboard.chart.progress.empty")}</p>}
          </PanelBody>
        </Panel>
        <Panel className="xl:col-span-3">
          <PanelHeader title={t("dashboard.chart.recent.title")} action={<span className="font-mono text-[10px] text-muted-foreground">{t("dashboard.chart.recent.live")}</span>} />
          <PanelBody className="px-4"><ActivityList events={data.events} t={t} /></PanelBody>
        </Panel>
      </div>
    </div>
  );
}
