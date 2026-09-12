"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

import { WorkspaceAccessNotice } from "@/components/workspace-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeading } from "@/components/grant-ui";
import { useCreateOrganization } from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { errorMessage } from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";

export default function NewOrganizationPage() {
  const t = useTranslations();
  const router = useRouter();
  const { address } = useAccount();
  const session = useSession();
  const createOrganization = useCreateOrganization();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await createOrganization.mutateAsync({
        name,
        displayName,
        roleLabel: roleLabel.trim() || null,
      });
      router.push(`/app/organizations/${result.organization.id}`);
    } catch {
      // The safe server error is shown below.
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeading eyebrow={t("neworg.eyebrow")} title={t("neworg.title")}>
        <p>{t("neworg.lede")}</p>
      </PageHeading>
      <WorkspaceAccessNotice />
      {session.walletMatches && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {t("neworg.profile.title")}
            </CardTitle>
            <p className="pt-2 text-sm leading-6 text-muted-foreground">
              {t("neworg.profile.lede")}
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={(event) => void submit(event)}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t("neworg.field.name")}
                </span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  placeholder={t("neworg.field.name.placeholder")}
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t("neworg.field.displayName")}
                </span>
                <input
                  className="field"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={100}
                  placeholder={t("neworg.field.displayName.placeholder")}
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t("neworg.field.role")}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t("members.field.optional")}
                  </span>
                </span>
                <input
                  className="field"
                  value={roleLabel}
                  onChange={(event) => setRoleLabel(event.target.value)}
                  maxLength={100}
                  placeholder={t("neworg.field.role.placeholder")}
                />
              </label>
              <div className="rounded-lg bg-secondary/60 p-4 text-sm text-muted-foreground">
                {t("neworg.ownerWallet")}{" "}
                <span className="font-mono text-foreground">
                  {address?.slice(0, 8)}…{address?.slice(-6)}
                </span>
              </div>
              {createOrganization.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage(createOrganization.error)}
                </p>
              )}
              <Button type="submit" disabled={createOrganization.isPending}>
                {createOrganization.isPending
                  ? t("neworg.pending")
                  : t("neworg.action")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {!session.walletMatches && !session.isError && (
        <Notice title={t("neworg.locked.title")}>
          <p>{t("neworg.locked.body")}</p>
        </Notice>
      )}
    </div>
  );
}
