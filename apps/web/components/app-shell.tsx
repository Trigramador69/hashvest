"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { ReactNode } from "react";
import { cn } from "@/lib/shared/utils";
import { SessionControl } from "@/components/session-control";
import { useOrganizations } from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";

function OrganizationSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const organizations = useOrganizations();
  if (!session.walletMatches || !organizations.data?.length) return null;
  const activeId = pathname.match(/^\/app\/organizations\/([^/]+)/)?.[1] ?? "";
  const value = organizations.data.some((item) => item.id === activeId)
    ? activeId
    : "";
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline">Workspace</span>
      <select
        className="field h-9 min-w-36 py-1 text-xs sm:min-w-48"
        value={value}
        aria-label="Choose workspace"
        onChange={(event) => {
          if (event.target.value === "create")
            router.push("/app/organizations/new");
          else if (event.target.value)
            router.push(`/app/organizations/${event.target.value}`);
        }}
      >
        <option value="">Your organizations</option>
        {organizations.data.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
        <option value="create">+ Create organization</option>
      </select>
    </label>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"
            aria-label="HashVest home"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-lg text-primary-foreground">
              H
            </span>
            HashVest
          </Link>
          <nav
            aria-label="Main navigation"
            className="order-3 flex w-full gap-6 text-sm font-medium sm:order-none sm:w-auto"
          >
            <Link
              href="/app"
              className={cn(
                "nav-link",
                (pathname === "/app" ||
                  pathname.startsWith("/app/organizations")) &&
                  "text-primary",
              )}
            >
              Organizations / grants
            </Link>
            <Link
              href="/grants/new"
              className={cn(
                "nav-link",
                pathname === "/grants/new" && "text-primary",
              )}
            >
              Create grant
            </Link>
          </nav>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-3">
            <OrganizationSwitcher />
            <span className="hidden rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary lg:block">
              HSK Testnet · 133
            </span>
            <SessionControl compact />
            <ConnectButton
              accountStatus="address"
              chainStatus="icon"
              showBalance={false}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {children}
      </main>
      <footer className="mx-auto mt-10 flex max-w-7xl flex-wrap justify-between gap-3 border-t px-5 py-6 text-xs text-muted-foreground sm:px-8">
        <span>HashVest · Programmable grants on HashKey Chain</span>
        <span>Hackathon MVP · Unaudited · Testnet assets only</span>
      </footer>
    </div>
  );
}
