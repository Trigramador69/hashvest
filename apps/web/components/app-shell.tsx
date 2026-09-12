"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
              className={cn("nav-link", pathname === "/app" && "text-primary")}
            >
              My grants
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
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary lg:block">
              HSK Testnet · 133
            </span>
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
