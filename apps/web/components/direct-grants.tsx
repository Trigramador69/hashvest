"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { hashVestFactoryAbi, testnetDeployment } from "@hashvest/web3";

import { GrantCard } from "@/components/grant-card";
import { Notice } from "@/components/grant-ui";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { errorMessage } from "@/lib/protocol/grants";

const grantTabs = [
  {
    id: 0,
    method: "getGrantsByIssuer",
    label: "dashboard.tab.0",
    emptyTitle: "dashboard.empty.0.title",
    emptyBody: "dashboard.empty.0.body",
  },
  {
    id: 1,
    method: "getGrantsByBeneficiary",
    label: "dashboard.tab.1",
    emptyTitle: "dashboard.empty.1.title",
    emptyBody: "dashboard.empty.1.body",
  },
  {
    id: 2,
    method: "getGrantsByReviewer",
    label: "dashboard.tab.2",
    emptyTitle: "dashboard.empty.2.title",
    emptyBody: "dashboard.empty.2.body",
  },
] as const;

export function DirectGrants({
  address,
  connected,
}: {
  address?: `0x${string}`;
  connected: boolean;
}) {
  const t = useTranslations();
  const [tab, setTab] = useState<(typeof grantTabs)[number]["id"]>(0);
  const factory = testnetDeployment.factory;
  const selectedTab = grantTabs[tab];
  const grants = useReadContract({
    address: factory,
    abi: hashVestFactoryAbi,
    functionName: selectedTab.method,
    args: address ? [address] : undefined,
    chainId: 133,
    query: { enabled: Boolean(factory && address), refetchInterval: 7000 },
  });

  if (!connected || !factory) return null;

  return (
    <section className="space-y-3">
      <div
        className="flex flex-wrap gap-1 border-b border-border-soft"
        role="tablist"
        aria-label={t("dashboard.tablist")}
      >
        {grantTabs.map(({ id, label }) => (
          <Button
            key={id}
            role="tab"
            aria-selected={tab === id}
            variant={tab === id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTab(id)}
          >
            {t(label)}
          </Button>
        ))}
      </div>
      <div role="tabpanel">
        {grants.isPending ? (
          <Notice title={t("dashboard.grants.loading.title")}>
            <p>
              {t("dashboard.grants.loading.body", {
                network: "HSK Testnet",
                chainId: 133,
              })}
            </p>
          </Notice>
        ) : grants.isError ? (
          <Notice title={t("dashboard.grants.error.title")} error>
            <p>
              {errorMessage(grants.error, {
                fallback: t("ui.error.requestFailed"),
                rpcUnavailable: t("tx.error.rpcUnavailable", {
                  network: "HSK Testnet",
                  chainId: 133,
                }),
              })}
            </p>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={() => void grants.refetch()}
            >
              {t("dashboard.retry")}
            </Button>
          </Notice>
        ) : !grants.data?.length ? (
          <div className="rounded-card border border-dashed border-border p-8 text-center">
            <p className="font-mono text-sm text-foreground">
              {t(selectedTab.emptyTitle)}
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">
              {t(selectedTab.emptyBody)}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {grants.data.map((grant) => (
              <GrantCard key={grant} address={grant} received={tab === 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
