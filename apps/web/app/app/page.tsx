"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ArrowUpRight, Plus } from "lucide-react";
import { hashVestFactoryAbi, testnetDeployment } from "@hashvest/web3";

import { DashboardOverview } from "@/components/dashboard-visuals";
import { DemoFaucet } from "@/components/demo-faucet";
import { GrantCard } from "@/components/grant-card";
import { NetworkNotice, Notice } from "@/components/grant-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { DataArt } from "@/components/ui/data-art";
import { Panel } from "@/components/ui/panel";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import { useOrganizations } from "@/hooks/use-organizations";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { errorMessage } from "@/lib/protocol/grants";

const tabs = [0, 1, 2] as const;
const methods = [
  "getGrantsByIssuer",
  "getGrantsByBeneficiary",
  "getGrantsByReviewer",
] as const;

function WorkspaceStrip() {
  const t = useTranslations();
  const organizations = useOrganizations();
  if (organizations.isPending || organizations.isError || !organizations.data?.length) return null;
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-4">
        <div><p className="font-mono text-[10px] uppercase tracking-[.08em] text-primary">{t("orgs.eyebrow")}</p><p className="mt-1 text-xs text-muted-foreground">{t("orgs.heading")}</p></div>
        <Link href="/app/organizations/new" className="font-mono text-[10px] text-primary hover:underline">{t("orgs.create")} <ArrowUpRight className="inline size-3" strokeWidth={1.25} /></Link>
      </div>
      <div className="grid gap-px bg-border-soft sm:grid-cols-2 lg:grid-cols-3">
        {organizations.data.slice(0, 3).map((organization) => (
          <Link key={organization.id} href={`/app/organizations/${organization.id}`} className="bg-surface-1 p-4 transition-colors hover:bg-surface-hover">
            <div className="flex items-center justify-between gap-3"><span className="truncate font-mono text-xs text-foreground">{organization.name}</span><ArrowUpRight className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.25} /></div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">{t("orgs.counts", { members: organization.memberCount, grants: organization.grantCount })}</p>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function DirectGrants({ address, connected }: { address?: `0x${string}`; connected: boolean }) {
  const t = useTranslations();
  const [tab, setTab] = useState(0);
  const factory = testnetDeployment.factory;
  const grants = useReadContract({
    address: factory,
    abi: hashVestFactoryAbi,
    functionName: methods[tab],
    args: address ? [address] : undefined,
    chainId: 133,
    query: { enabled: Boolean(factory && address), refetchInterval: 7000 },
  });
  if (!connected || !factory) return null;
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-4">
        <div><h2 className="font-mono text-[15px] font-medium text-foreground">{t("dashboard.direct.title")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("dashboard.direct.lede")}</p></div>
        <Link href="/grants/new" className={buttonVariants({ size: "sm" })}><Plus className="size-3" strokeWidth={1.25} /> {t("dashboard.createGrant")}</Link>
      </div>
      <div className="flex gap-1 border-b border-border-soft px-5 pt-3" role="tablist" aria-label={t("dashboard.tablist")}>
        {tabs.map((id) => (
          <Button key={id} role="tab" aria-selected={tab === id} variant={tab === id ? "secondary" : "ghost"} size="sm" onClick={() => setTab(id)}>{t(`dashboard.tab.${id}`)}</Button>
        ))}
      </div>
      <div className="p-5" role="tabpanel">
        {grants.isPending ? <Notice title={t("dashboard.grants.loading.title")}><p>{t("dashboard.grants.loading.body", { network: "HSK Testnet", chainId: 133 })}</p></Notice> : grants.isError ? <Notice title={t("dashboard.grants.error.title")} error><p>{errorMessage(grants.error)}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => void grants.refetch()}>{t("dashboard.retry")}</Button></Notice> : !grants.data?.length ? <div className="border border-dashed border-border p-8 text-center"><p className="font-mono text-sm text-foreground">{t(`dashboard.empty.${tabs[tab]}.title`)}</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">{t(`dashboard.empty.${tabs[tab]}.body`)}</p>{tab === 0 && <Link className={`${buttonVariants({ size: "sm" })} mt-4`} href="/grants/new">{t("dashboard.empty.createGrant")}</Link>}</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{grants.data.map((grant) => <GrantCard key={grant} address={grant} received={tab === 1} />)}</div>}
      </div>
    </Panel>
  );
}

export default function Dashboard() {
  const t = useTranslations();
  const { address, isConnected } = useAccount();
  const analytics = useDashboardAnalytics();
  const organizations = useOrganizations();
  return (
    <div className="space-y-5">
      <section className="relative grid min-h-[195px] items-center overflow-hidden lg:grid-cols-8">
        <div className="relative z-10 lg:col-span-5">
          <p className="font-mono text-[10px] uppercase tracking-[.08em] text-primary">{t("dashboard.eyebrow")}</p>
          <h1 className="mt-5 max-w-2xl font-mono text-[clamp(42px,4.1vw,60px)] font-normal leading-[.98] tracking-[-.045em] text-foreground">{t("dashboard.title")}</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{t("dashboard.lede")}</p>
        </div>
        <DataArt variant="orb" className="absolute -right-4 top-0 h-52 w-[52%] opacity-75 lg:col-span-3" />
        <div className="absolute right-0 top-6 hidden font-mono text-[10px] leading-6 text-muted-foreground/60 sm:block">IDEAS<br />DATA<br />PEOPLE<br />IMPACT</div>
      </section>
      <NetworkNotice />
      <DashboardOverview analytics={analytics} organizationCount={organizations.data?.length ?? 0} connected={isConnected} />
      <WorkspaceStrip />
      <DirectGrants address={address} connected={isConnected} />
      {!testnetDeployment.factory && <Notice title={t("dashboard.noDeployment.title")}><p>{t("dashboard.noDeployment.body")}</p></Notice>}
      <DemoFaucet />
    </div>
  );
}

