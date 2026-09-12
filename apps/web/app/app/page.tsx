"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import {
  hashVestFactoryAbi,
  hskTestnet,
  testnetDeployment,
} from "@hashvest/web3";
import { Button, buttonVariants } from "@/components/ui/button";
import { NetworkNotice, Notice, PageHeading } from "@/components/grant-ui";
import { DemoFaucet } from "@/components/demo-faucet";
import { GrantCard } from "@/components/grant-card";
import { SessionControl } from "@/components/session-control";
import { useOrganizations } from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { errorMessage } from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";

/** Tab ids; labels come from the dictionary. */
const tabs = [0, 1, 2] as const;
/** Protocol literals: never translated, only interpolated. */
const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };
const methods = [
  "getGrantsByIssuer",
  "getGrantsByBeneficiary",
  "getGrantsByReviewer",
] as const;

function OrganizationsSection({ isConnected }: { isConnected: boolean }) {
  const t = useTranslations();
  const session = useSession();
  const organizations = useOrganizations();
  if (!isConnected) return null;
  if (session.isError)
    return (
      <Notice title={t("orgs.notConfigured.title")} error>
        <p>{t("orgs.notConfigured.body")}</p>
      </Notice>
    );
  if (!session.walletMatches)
    return (
      <Notice title={t("orgs.signIn.title")}>
        <p>{t("orgs.signIn.body")}</p>
        <div className="mt-4">
          <SessionControl />
        </div>
      </Notice>
    );
  if (organizations.isPending)
    return (
      <Notice title={t("orgs.loading.title")}>
        <p>{t("orgs.loading.body")}</p>
      </Notice>
    );
  if (organizations.isError)
    return (
      <Notice title={t("orgs.error.title")} error>
        <p>
          {errorMessage(organizations.error, {
            fallback: t("ui.error.requestFailed"),
            rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
          })}
        </p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => void organizations.refetch()}
        >
          {t("dashboard.retry")}
        </Button>
      </Notice>
    );
  return (
    <section className="space-y-4" aria-labelledby="organizations-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
            {t("orgs.eyebrow")}
          </p>
          <h2
            id="organizations-heading"
            className="mt-2 text-2xl font-semibold tracking-tight"
          >
            {t("orgs.heading")}
          </h2>
        </div>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/app/organizations/new"
        >
          {t("orgs.create")}
        </Link>
      </div>
      {!organizations.data?.length ? (
        <div className="rounded-xl border border-dashed p-8">
          <p className="font-semibold">{t("orgs.empty.title")}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("orgs.empty.body")}
          </p>
          <Link
            className={`${buttonVariants()} mt-4`}
            href="/app/organizations/new"
          >
            {t("orgs.empty.action")} <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {organizations.data.map((organization) => (
            <Link
              key={organization.id}
              href={`/app/organizations/${organization.id}`}
              className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{organization.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("orgs.counts", {
                      members: organization.memberCount,
                      grants: organization.grantCount,
                    })}
                  </p>
                </div>
                <span className="text-primary" aria-hidden>
                  ↗
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const t = useTranslations();
  const [tab, setTab] = useState(0);
  const { address, isConnected } = useAccount();
  const factory = testnetDeployment.factory;
  const grants = useReadContract({
    address: factory,
    abi: hashVestFactoryAbi,
    functionName: methods[tab],
    args: address ? [address] : undefined,
    chainId: 133,
    query: { enabled: Boolean(factory && address), refetchInterval: 7000 },
  });
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        action={
          <Link href="/grants/new" className={buttonVariants()}>
            {t("dashboard.createGrant")} <span aria-hidden>+</span>
          </Link>
        }
      >
        <p>{t("dashboard.lede")}</p>
      </PageHeading>
      <NetworkNotice />
      <OrganizationsSection isConnected={isConnected} />
      {!factory && (
        <Notice title={t("dashboard.noDeployment.title")}>
          <p>{t("dashboard.noDeployment.body")}</p>
        </Notice>
      )}
      {isConnected && factory && (
        <>
          <div
            role="tablist"
            aria-label={t("dashboard.tablist")}
            className="flex gap-2 border-b pb-3"
          >
            {tabs.map((id, index) => (
              <Button
                key={id}
                role="tab"
                id={`role-${index}`}
                aria-selected={tab === index}
                aria-controls="grant-list"
                variant={tab === index ? "default" : "outline"}
                onClick={() => setTab(index)}
              >
                {t(`dashboard.tab.${id}`)}
              </Button>
            ))}
          </div>
          <div role="tabpanel" id="grant-list" aria-labelledby={`role-${tab}`}>
            {grants.isPending ? (
              <Notice title={t("dashboard.grants.loading.title")}>
                <p>{t("dashboard.grants.loading.body", NETWORK)}</p>
              </Notice>
            ) : grants.isError ? (
              <Notice title={t("dashboard.grants.error.title")} error>
                <p>
                  {errorMessage(grants.error, {
                    fallback: t("ui.error.requestFailed"),
                    rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
                  })}
                </p>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => void grants.refetch()}
                >
                  {t("dashboard.retry")}
                </Button>
              </Notice>
            ) : !grants.data?.length ? (
              <div className="rounded-2xl border border-dashed p-12 text-center">
                <p className="text-xl font-semibold">
                  {t(`dashboard.empty.${tabs[tab]}.title`)}
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                  {t(`dashboard.empty.${tabs[tab]}.body`)}
                </p>
                {tab === 0 && (
                  <Link
                    className={`${buttonVariants()} mt-5`}
                    href="/grants/new"
                  >
                    {t("dashboard.empty.createGrant")}
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {grants.data.map((grant) => (
                  <GrantCard key={grant} address={grant} received={tab === 1} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <DemoFaucet />
    </div>
  );
}
