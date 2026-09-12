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
import { errorMessage } from "@/lib/protocol/grants";

const tabs = ["Issued", "Received", "Review"] as const;
const methods = [
  "getGrantsByIssuer",
  "getGrantsByBeneficiary",
  "getGrantsByReviewer",
] as const;

function WorkspaceStrip() {
  const organizations = useOrganizations();
  if (organizations.isPending || organizations.isError || !organizations.data?.length) return null;
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-4">
        <div><p className="font-mono text-[10px] uppercase tracking-[.08em] text-primary">Your workspaces</p><p className="mt-1 text-xs text-muted-foreground">Organization context for your grants.</p></div>
        <Link href="/app/organizations/new" className="font-mono text-[10px] text-primary hover:underline">Create workspace <ArrowUpRight className="inline size-3" strokeWidth={1.25} /></Link>
      </div>
      <div className="grid gap-px bg-border-soft sm:grid-cols-2 lg:grid-cols-3">
        {organizations.data.slice(0, 3).map((organization) => (
          <Link key={organization.id} href={`/app/organizations/${organization.id}`} className="bg-surface-1 p-4 transition-colors hover:bg-surface-hover">
            <div className="flex items-center justify-between gap-3"><span className="truncate font-mono text-xs text-foreground">{organization.name}</span><ArrowUpRight className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.25} /></div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">{organization.memberCount} members · {organization.grantCount} grants</p>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function DirectGrants({ address, connected }: { address?: `0x${string}`; connected: boolean }) {
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
        <div><h2 className="font-mono text-[15px] font-medium text-foreground">Direct grants</h2><p className="mt-1 text-xs text-muted-foreground">Role-specific GrantVaults for the connected wallet.</p></div>
        <Link href="/grants/new" className={buttonVariants({ size: "sm" })}><Plus className="size-3" strokeWidth={1.25} /> Create grant</Link>
      </div>
      <div className="flex gap-1 border-b border-border-soft px-5 pt-3" role="tablist" aria-label="Grant role">
        {tabs.map((label, index) => (
          <Button key={label} role="tab" aria-selected={tab === index} variant={tab === index ? "secondary" : "ghost"} size="sm" onClick={() => setTab(index)}>{label}</Button>
        ))}
      </div>
      <div className="p-5" role="tabpanel">
        {grants.isPending ? <p className="border border-dashed border-border p-6 font-mono text-xs text-muted-foreground">Reading GrantVaults…</p> : grants.isError ? <Notice title="Unable to load grants" error><p>{errorMessage(grants.error)}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => void grants.refetch()}>Retry</Button></Notice> : !grants.data?.length ? <div className="border border-dashed border-border p-8 text-center"><p className="font-mono text-sm text-foreground">No grants in this role yet.</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">Create a grant or wait for a wallet assignment to appear here.</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{grants.data.map((grant) => <GrantCard key={grant} address={grant} received={tab === 1} />)}</div>}
      </div>
    </Panel>
  );
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const analytics = useDashboardAnalytics();
  const organizations = useOrganizations();
  return (
    <div className="space-y-5">
      <section className="relative grid min-h-[195px] items-center overflow-hidden lg:grid-cols-8">
        <div className="relative z-10 lg:col-span-5">
          <p className="font-mono text-[10px] uppercase tracking-[.08em] text-primary">Dashboard</p>
          <h1 className="mt-5 max-w-2xl font-mono text-[clamp(42px,4.1vw,60px)] font-normal leading-[.98] tracking-[-.045em] text-foreground">Work smarter.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">Turn grants into action. Track progress, review milestones and move what’s next forward onchain.</p>
        </div>
        <DataArt variant="orb" className="absolute -right-4 top-0 h-52 w-[52%] opacity-75 lg:col-span-3" />
        <div className="absolute right-0 top-6 hidden font-mono text-[10px] leading-6 text-muted-foreground/60 sm:block">IDEAS<br />DATA<br />PEOPLE<br />IMPACT</div>
      </section>
      <NetworkNotice />
      <DashboardOverview analytics={analytics} organizationCount={organizations.data?.length ?? 0} connected={isConnected} />
      <WorkspaceStrip />
      <DirectGrants address={address} connected={isConnected} />
      {!testnetDeployment.factory && <Notice title="Testnet deployment is not configured"><p>The application needs the HashVest Testnet deployment before it can load or create real grants.</p></Notice>}
      <DemoFaucet />
    </div>
  );
}

