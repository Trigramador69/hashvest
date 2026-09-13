"use client";

import { useAccount } from "wagmi";
import { testnetDeployment } from "@hashvest/web3";

import { DashboardOverview } from "@/components/dashboard-visuals";
import { NetworkNotice, Notice } from "@/components/grant-ui";
import { DataArt } from "@/components/ui/data-art";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import { useOrganizations } from "@/hooks/use-organizations";
import { useTranslations } from "@/lib/shared/i18n/provider";

export default function Dashboard() {
  const t = useTranslations();
  const { isConnected } = useAccount();
  const analytics = useDashboardAnalytics();
  const organizations = useOrganizations();

  return (
    <div className="space-y-5">
      <section className="relative grid min-h-[195px] items-center overflow-hidden lg:grid-cols-8">
        <div className="relative z-10 lg:col-span-5">
          <p className="font-mono text-[10px] uppercase tracking-[.08em] text-primary">
            {t("dashboard.eyebrow")}
          </p>
          <h1 className="font-display mt-5 max-w-2xl text-[clamp(42px,4.1vw,60px)] font-normal leading-[.98] tracking-[-.045em] text-foreground">
            {t("dashboard.title")}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("dashboard.lede")}
          </p>
        </div>
        <DataArt
          variant="orb"
          className="absolute -right-4 top-0 h-52 w-[52%] opacity-75 lg:col-span-3"
        />
      </section>
      <NetworkNotice />
      <DashboardOverview
        analytics={analytics}
        organizationCount={organizations.data?.length ?? 0}
        connected={isConnected}
      />
      {!testnetDeployment.factory && (
        <Notice title={t("dashboard.noDeployment.title")}>
          <p>{t("dashboard.noDeployment.body")}</p>
        </Notice>
      )}
    </div>
  );
}
