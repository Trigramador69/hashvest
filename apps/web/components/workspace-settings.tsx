"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

import { NetworkNotice, PageHeading } from "@/components/grant-ui";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SessionControl } from "@/components/session-control";
import { WorkspaceAccessNotice } from "@/components/workspace-access";
import { buttonVariants } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { useOrganizations } from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { appRoutes } from "@/lib/shared/routes";

export function WorkspaceSettings() {
  const t = useTranslations();
  const { isConnected } = useAccount();
  const session = useSession();
  const organizations = useOrganizations();

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
          <LocaleSwitcher size="default" />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={t("settings.sponsorship.title")}
          description={t("settings.sponsorship.body")}
        />
        <PanelBody className="space-y-3">
          {!session.walletMatches ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {t("settings.sponsorship.signIn")}
            </p>
          ) : organizations.isPending ? (
            <p className="font-mono text-xs text-muted-foreground">
              {t("organizations.loading.body")}
            </p>
          ) : organizations.data?.length ? (
            <ul className="divide-y divide-border-soft rounded-control border border-border-soft">
              {organizations.data.map((organization) => (
                <li
                  key={organization.id}
                  className="flex min-h-12 items-center justify-between gap-3 px-3"
                >
                  <span className="truncate font-mono text-xs text-foreground">
                    {organization.name}
                  </span>
                  <Link
                    className="shrink-0 font-mono text-xs text-primary hover:underline"
                    href={appRoutes.organizationSettings(organization.id)}
                  >
                    {t("settings.sponsorship.configure")} →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                {t("settings.sponsorship.empty")}
              </p>
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={appRoutes.newOrganization}
              >
                {t("organizations.create")}
              </Link>
            </div>
          )}
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
