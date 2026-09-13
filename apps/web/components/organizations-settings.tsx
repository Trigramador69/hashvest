"use client";

import Link from "next/link";

import { Notice, PageHeading } from "@/components/grant-ui";
import { WorkspaceAccessNotice } from "@/components/workspace-access";
import { Button, buttonVariants } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { useOrganizations } from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { errorMessage } from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { appRoutes } from "@/lib/shared/routes";

export function OrganizationsSettings() {
  const t = useTranslations();
  const session = useSession();
  const organizations = useOrganizations();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeading
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        action={
          session.walletMatches ? (
            <Link
              className={buttonVariants({ size: "sm" })}
              href={appRoutes.newOrganization}
            >
              {t("settings.create")}
            </Link>
          ) : undefined
        }
      >
        <p>{t("settings.lede")}</p>
      </PageHeading>

      <WorkspaceAccessNotice />

      {session.walletMatches && organizations.isPending && (
        <Notice title={t("settings.loading.title")}>
          <p>{t("settings.loading.body")}</p>
        </Notice>
      )}

      {session.walletMatches && organizations.isError && (
        <Notice title={t("settings.error.title")} error>
          <p>
            {errorMessage(organizations.error, {
              fallback: t("settings.error.body"),
            })}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            size="sm"
            onClick={() => void organizations.refetch()}
          >
            {t("settings.retry")}
          </Button>
        </Notice>
      )}

      {session.walletMatches &&
        organizations.isSuccess &&
        (organizations.data?.length ? (
          <Panel>
            <PanelHeader title={t("settings.list.title")} />
            <PanelBody className="p-0">
              <div className="divide-y divide-border-soft">
                {organizations.data.map((organization) => (
                  <Link
                    key={organization.id}
                    href={appRoutes.organization(organization.id)}
                    className="group flex min-h-20 items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-hover"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-sm text-foreground">
                        {organization.name}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                        {t("settings.organization.counts", {
                          members: organization.memberCount,
                          grants: organization.grantCount,
                        })}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      {t("settings.organization.open")} →
                    </span>
                  </Link>
                ))}
              </div>
            </PanelBody>
          </Panel>
        ) : (
          <div className="rounded-card border border-dashed border-border p-10 text-center">
            <p className="font-mono text-lg text-foreground">
              {t("settings.empty.title")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {t("settings.empty.body")}
            </p>
          </div>
        ))}
    </div>
  );
}
