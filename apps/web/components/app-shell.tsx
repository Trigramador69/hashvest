"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  ChevronDown,
  Command,
  Database,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Search,
  Settings2,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import { cn } from "@/lib/shared/utils";
import { useTranslations } from "@/lib/shared/i18n/provider";
import type { TranslationKey } from "@/lib/shared/i18n/dictionaries/en";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SessionControl } from "@/components/session-control";
import { useOrganizations } from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";

type Icon = typeof LayoutDashboard;

const NAV_ITEMS: Array<{
  href: string;
  label: Extract<TranslationKey, `shell.nav.${string}`>;
  icon: Icon;
}> = [
  { href: "/app", label: "shell.nav.overview", icon: LayoutDashboard },
  { href: "/app", label: "shell.nav.projects", icon: FolderKanban },
  { href: "/app", label: "shell.nav.data", icon: Database },
  { href: "/app", label: "shell.nav.models", icon: BrainCircuit },
  { href: "/app", label: "shell.nav.insights", icon: BarChart3 },
  { href: "/app", label: "shell.nav.team", icon: UsersRound },
];

function OrganizationSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const organizations = useOrganizations();
  const t = useTranslations();
  if (!session.walletMatches || !organizations.data?.length) return null;
  const activeId = pathname.match(/^\/app\/organizations\/([^/]+)/)?.[1] ?? "";
  const value = organizations.data.some((item) => item.id === activeId)
    ? activeId
    : "";
  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden xl:inline">{t("shell.workspace.label")}</span>
      <select
        className="field h-9 min-w-0 max-w-48 py-1 font-mono text-[11px] sm:min-w-44"
        value={value}
        aria-label={t("shell.workspace.choose")}
        onChange={(event) => {
          if (event.target.value === "create")
            router.push("/app/organizations/new");
          else if (event.target.value)
            router.push(`/app/organizations/${event.target.value}`);
        }}
      >
        <option value="">{t("shell.workspace.yours")}</option>
        {organizations.data.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
        <option value="create">{t("shell.workspace.create")}</option>
      </select>
    </label>
  );
}

function GlobalSearch({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const t = useTranslations();
  const organizations = useOrganizations();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const entries = useMemo(
    () => [
      {
        label: t("shell.search.overview"),
        detail: t("shell.search.overviewDetail"),
        href: "/app",
      },
      {
        label: t("shell.search.createGrant"),
        detail: t("shell.search.createGrantDetail"),
        href: "/grants/new",
      },
      {
        label: t("shell.search.newOrganization"),
        detail: t("shell.workspace.label"),
        href: "/app/organizations/new",
      },
      ...(organizations.data ?? []).map((organization) => ({
        label: organization.name,
        detail: t("shell.search.workspaceDetail", {
          members: organization.memberCount,
          grants: organization.grantCount,
        }),
        href: `/app/organizations/${organization.id}`,
      })),
    ],
    [organizations.data, t],
  );
  const results = entries
    .filter((entry) =>
      `${entry.label} ${entry.detail}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 6);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        document.getElementById("global-search")?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    onNavigate();
    router.push(href);
  }

  function submit() {
    const trimmed = query.trim();
    if (/^0x[a-f\d]{40}$/i.test(trimmed)) return go(`/grants/${trimmed}`);
    if (results[0]) go(results[0].href);
  }

  return (
    <div className="relative w-full max-w-[440px]">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.25}
      />
      <input
        id="global-search"
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-label={t("shell.search.label")}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder={t("shell.search.placeholder")}
        className="field h-10 pl-10 pr-16 font-mono text-xs"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground sm:flex">
        <Command className="size-3" strokeWidth={1.25} />K
      </span>
      {open && (query || results.length > 0) && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-card border border-border bg-surface-2 p-1 shadow-[0_10px_28px_rgba(0,0,0,.28)]"
        >
          {results.length ? (
            results.map((result) => (
              <button
                key={result.href}
                type="button"
                role="option"
                aria-selected="false"
                className="flex w-full items-center justify-between gap-4 rounded-control px-3 py-2 text-left transition-colors hover:bg-surface-hover"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(result.href)}
              >
                <span className="min-w-0 truncate font-mono text-xs text-foreground">
                  {result.label}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {result.detail}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {t("shell.search.empty")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ShellNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const t = useTranslations();
  return (
    <nav aria-label={t("shell.nav.label")} className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: IconComponent }, index) => {
        const active = index === 0 && pathname === "/app";
        return (
          <Link
            key={`${label}-${index}`}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-[42px] items-center gap-3 rounded-control px-4 font-mono text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
              active && "bg-[rgba(87,217,139,.10)] text-primary",
            )}
            aria-current={active ? "page" : undefined}
          >
            <IconComponent className="size-4" strokeWidth={1.25} />
            <span>{t(label)}</span>
          </Link>
        );
      })}
      <Link
        href="/app/organizations/new"
        onClick={onNavigate}
        className="flex min-h-[42px] items-center gap-3 rounded-control px-4 font-mono text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Settings2 className="size-4" strokeWidth={1.25} />
        <span>{t("shell.nav.settings")}</span>
      </Link>
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
            className="rounded-control p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground md:hidden"
            onClick={onClose}
            aria-label={t("shell.navigation.close")}
          >
            <X className="size-4" strokeWidth={1.25} />
          </button>
        </div>
        <ShellNav onNavigate={onClose} />
        <div className="mt-auto space-y-4 border-t border-border-soft px-3 pt-4">
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Sparkles className="size-3 text-primary" strokeWidth={1.25} />
            <span>{t("shell.brand")}</span>
          </div>
          <p className="font-mono text-[10px] text-[#50524F]">
            {t("shell.version")}
          </p>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-20 min-h-[64px] border-b border-border-soft bg-[rgba(7,8,8,.96)] md:ml-[192px] md:min-h-[84px]">
      <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center gap-3 px-3 md:min-h-[84px] md:px-5">
        <button
          type="button"
          className="rounded-control p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground md:hidden"
          onClick={onMenu}
          aria-label={t("shell.navigation.open")}
        >
          <Menu className="size-5" strokeWidth={1.25} />
        </button>
        <GlobalSearch onNavigate={() => undefined} />
        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-4">
          <button
            type="button"
            className="relative rounded-control p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label={t("shell.notifications")}
          >
            <Bell className="size-4" strokeWidth={1.25} />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
          </button>
          <OrganizationSwitcher />
          <LocaleSwitcher />
          <SessionControl compact />
          <ConnectButton
            accountStatus="avatar"
            chainStatus="icon"
            showBalance={false}
          />
          <ChevronDown
            className="hidden size-4 text-muted-foreground lg:block"
            strokeWidth={1.25}
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
              href="/app"
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
  if (pathname === "/") return <MarketingShell>{children}</MarketingShell>;
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Topbar onMenu={() => setMenuOpen(true)} />
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
