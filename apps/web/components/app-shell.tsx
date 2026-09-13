"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Building2,
  FileText,
  LayoutDashboard,
  Menu,
  Settings2,
  X,
} from "lucide-react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SessionControl } from "@/components/session-control";
import type { TranslationKey } from "@/lib/shared/i18n/dictionaries/en";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { appRoutes } from "@/lib/shared/routes";
import { cn } from "@/lib/shared/utils";

type Icon = typeof LayoutDashboard;

const NAV_ITEMS: Array<{
  href: string;
  label: Extract<TranslationKey, `shell.nav.${string}`>;
  icon: Icon;
}> = [
  {
    href: appRoutes.overview,
    label: "shell.nav.overview",
    icon: LayoutDashboard,
  },
  { href: appRoutes.grants, label: "shell.nav.grants", icon: FileText },
  {
    href: appRoutes.organizations,
    label: "shell.nav.organizations",
    icon: Building2,
  },
  { href: appRoutes.settings, label: "shell.nav.settings", icon: Settings2 },
];

function ShellNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const t = useTranslations();

  function isActive(href: string) {
    if (href === appRoutes.overview) return pathname === href;
    if (href === appRoutes.grants) {
      return pathname === href || pathname.startsWith("/grants/");
    }
    if (href === appRoutes.organizations) {
      return pathname.startsWith(appRoutes.organizations);
    }
    return pathname === appRoutes.settings;
  }

  return (
    <nav aria-label={t("shell.nav.label")} className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: IconComponent }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-control px-4 font-mono text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
              active && "bg-[rgba(87,217,139,.10)] text-primary",
            )}
            aria-current={active ? "page" : undefined}
          >
            <IconComponent className="size-4" strokeWidth={1.25} />
            <span>{t(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={t("shell.navigation.close")}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[192px] -translate-x-full flex-col border-r border-border-soft bg-canvas px-[10px] py-5 transition-transform duration-180 md:translate-x-0",
          open && "translate-x-0",
        )}
      >
        <div className="mb-10 flex items-center justify-between px-3">
          <Link
            href="/"
            className="font-mono text-[25px] font-medium tracking-[-0.06em] text-foreground"
            aria-label={t("shell.home")}
          >
            HashVest
          </Link>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-control text-muted-foreground hover:bg-surface-2 hover:text-foreground md:hidden"
            onClick={onClose}
            aria-label={t("shell.navigation.close")}
          >
            <X className="size-4" strokeWidth={1.25} />
          </button>
        </div>
        <ShellNav onNavigate={onClose} />
        <div className="mt-auto border-t border-border-soft px-3 pt-4">
          <p className="font-mono text-[10px] text-muted-foreground">
            {t("shell.appTagline")}
          </p>
          <p className="mt-2 font-mono text-[10px] text-[#50524F]">
            {t("shell.appDisclaimer")}
          </p>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  menuOpen,
  onMenu,
}: {
  menuOpen: boolean;
  onMenu: () => void;
}) {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-20 min-h-[64px] border-b border-border-soft bg-[rgba(7,8,8,.96)] md:ml-[192px] md:min-h-[84px]">
      <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center gap-3 px-3 md:min-h-[84px] md:px-5">
        <button
          type="button"
          className={cn(
            "grid size-11 place-items-center rounded-control text-muted-foreground hover:bg-surface-2 hover:text-foreground md:hidden",
            menuOpen && "invisible",
          )}
          onClick={onMenu}
          aria-label={t("shell.navigation.open")}
        >
          <Menu className="size-5" strokeWidth={1.25} />
        </button>
        <div
          className={cn(
            "ml-auto flex shrink-0 items-center gap-2 md:gap-4",
            menuOpen && "invisible md:visible",
          )}
        >
          <LocaleSwitcher />
          <SessionControl compact />
          <ConnectButton
            accountStatus="avatar"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}

function MarketingShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border-soft bg-[rgba(7,8,8,.96)]">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="font-mono text-xl tracking-[-0.05em]">
            HashVest
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link
              href="/plans"
              className="rounded-control border border-border px-3 py-2 font-mono text-xs text-foreground hover:bg-surface-2"
            >
              {t("shell.nav.plans")}
            </Link>
            <Link
              href={appRoutes.overview}
              className="rounded-control border border-border px-3 py-2 font-mono text-xs text-foreground hover:bg-surface-2"
            >
              {t("home.cta.openApp")}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
      <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 border-t border-border-soft px-5 py-6 font-mono text-[10px] text-muted-foreground sm:px-8">
        <span>{t("shell.footer.tagline")}</span>
        <span>{t("shell.footer.disclaimer")}</span>
      </footer>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  if (pathname === "/" || pathname === "/plans")
    return <MarketingShell>{children}</MarketingShell>;
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Topbar menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />
      <main className="mx-auto min-h-[calc(100vh-84px)] max-w-[1440px] px-3 py-5 sm:px-5 sm:py-8 md:ml-[192px] md:px-5 md:py-8">
        {children}
      </main>
      <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 border-t border-border-soft px-3 py-6 font-mono text-[10px] text-muted-foreground sm:px-5 md:ml-[192px] md:px-5">
        <span>{t("shell.appTagline")}</span>
        <span>{t("shell.appDisclaimer")}</span>
      </footer>
    </div>
  );
}
