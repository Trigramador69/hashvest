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
        eyebrow={t("organizations.eyebrow")}
        title={t("organizations.title")}
        action={
          session.walletMatches ? (
            <Link
              className={buttonVariants({ size: "sm" })}
              href={appRoutes.newOrganization}
            >
              {t("organizations.create")}
            </Link>
          ) : undefined
        }
      >
        <p>{t("organizations.lede")}</p>
      </PageHeading>

      <WorkspaceAccessNotice />

      {session.walletMatches && organizations.isPending && (
        <Notice title={t("organizations.loading.title")}>
          <p>{t("organizations.loading.body")}</p>
        </Notice>
      )}

      {session.walletMatches && organizations.isError && (
        <Notice title={t("organizations.error.title")} error>
          <p>
            {errorMessage(organizations.error, {
              fallback: t("organizations.error.body"),
            })}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            size="sm"
            onClick={() => void organizations.refetch()}
          >
            {t("organizations.retry")}
          </Button>
        </Notice>
      )}

      {session.walletMatches &&
        organizations.isSuccess &&
        (organizations.data?.length ? (
          <Panel>
            <PanelHeader title={t("organizations.list.title")} />
            <PanelBody className="p-0">
              <div className="divide-y divide-border-soft">
                {organizations.data.map((organization) => (
                  <div
                    key={organization.id}
                    className="flex min-h-20 items-center justify-between gap-4 px-5 py-4"
                  >
                    <Link
                      href={appRoutes.organization(organization.id)}
                      className="min-w-0 hover:text-primary"
                    >
                      <span className="block truncate font-mono text-sm text-foreground">
                        {organization.name}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                        {t("organizations.organization.counts", {
                          members: organization.memberCount,
                          grants: organization.grantCount,
                        })}
                      </span>
                    </Link>
                    <span className="flex shrink-0 items-center gap-3">
                      <Link
                        href={appRoutes.organizationSettings(organization.id)}
                        className="font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t("organizations.organization.policy")}
                      </Link>
                      <Link
                        href={appRoutes.organization(organization.id)}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {t("organizations.organization.open")} →
                      </Link>
                    </span>
                  </div>
                ))}
              </div>
            </PanelBody>
          </Panel>
        ) : (
          <div className="rounded-card border border-dashed border-border p-10 text-center">
            <p className="font-mono text-lg text-foreground">
              {t("organizations.empty.title")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {t("organizations.empty.body")}
            </p>
          </div>
        ))}
    </div>
  );
}
