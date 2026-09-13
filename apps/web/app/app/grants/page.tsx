"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { testnetDeployment } from "@hashvest/web3";

import { DirectGrants } from "@/components/direct-grants";
import { NetworkNotice, Notice, PageHeading } from "@/components/grant-ui";
import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { appRoutes } from "@/lib/shared/routes";

export default function GrantsPage() {
  const t = useTranslations();
  const { address, isConnected } = useAccount();

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow={t("grants.eyebrow")}
        title={t("grants.title")}
        action={
          <Link
            className={buttonVariants({ size: "sm" })}
            href={appRoutes.createGrant}
          >
            {t("grants.create")} <span aria-hidden>+</span>
          </Link>
        }
      >
        <p>{t("grants.lede")}</p>
      </PageHeading>
      <NetworkNotice />
      {!testnetDeployment.factory && (
        <Notice title={t("dashboard.noDeployment.title")}>
          <p>{t("dashboard.noDeployment.body")}</p>
        </Notice>
      )}
      <DirectGrants address={address} connected={isConnected} />
    </div>
  );
}
