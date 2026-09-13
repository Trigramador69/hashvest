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

export default function NewOrganizationPage() {
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
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeading eyebrow="New organization" title="Create a workspace.">
        <p>
          Set up a calm home for your ecosystem, startup, DAO, foundation, or
          treasury team.
        </p>
      </PageHeading>
      <WorkspaceAccessNotice />
      {session.walletMatches && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[18px]">Your organization profile</CardTitle>
            <p className="pt-2 text-sm leading-6 text-muted-foreground">
              You will be added automatically as the sole owner. Organization
              role labels describe people; they do not change GrantVault
              permissions.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={(event) => void submit(event)}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium">Organization name</span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  placeholder="HashKey LATAM Ecosystem"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Your display name</span>
                <input
                  className="field"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={100}
                  placeholder="Alejandro Castro"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  Your role/title{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </span>
                <input
                  className="field"
                  value={roleLabel}
                  onChange={(event) => setRoleLabel(event.target.value)}
                  maxLength={100}
                  placeholder="Ecosystem Lead"
                />
              </label>
              <div className="rounded-card border border-border bg-surface-2 p-4 text-xs leading-5 text-muted-foreground">
                Connected owner wallet:{" "}
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
                  ? "Creating workspace…"
                  : "Create organization"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {!session.walletMatches && !session.isError && (
        <Notice title="Organization creation is locked">
          <p>
            Connect and sign in with the wallet that should own this
            organization.
          </p>
        </Notice>
      )}
    </div>
  );
}
