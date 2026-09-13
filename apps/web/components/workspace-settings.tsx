"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

import { NetworkNotice, PageHeading } from "@/components/grant-ui";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SessionControl } from "@/components/session-control";
import { WorkspaceAccessNotice } from "@/components/workspace-access";
import { buttonVariants } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { useTranslations } from "@/lib/shared/i18n/provider";

export function WorkspaceSettings() {
  const t = useTranslations();
  const { isConnected } = useAccount();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeading eyebrow={t("settings.eyebrow")} title={t("settings.title")}>
        <p>{t("settings.lede")}</p>
      </PageHeading>

      <WorkspaceAccessNotice />
      <NetworkNotice />

      {isConnected && (
        <Panel>
          <PanelHeader
            title={t("settings.session.title")}
            description={t("settings.session.body")}
          />
          <PanelBody>
            <SessionControl />
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelHeader
          title={t("settings.language.title")}
          description={t("settings.language.body")}
        />
        <PanelBody>
          <LocaleSwitcher />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={t("settings.plans.title")}
          description={t("settings.plans.body")}
        />
        <PanelBody>
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href="/plans"
          >
            {t("settings.plans.action")}
          </Link>
        </PanelBody>
      </Panel>
    </div>
  );
}
