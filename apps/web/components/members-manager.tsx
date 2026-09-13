"use client";

import { useState, type FormEvent } from "react";
import { getAddress } from "viem";
import { hskTestnet } from "@hashvest/web3";

import {
  useOrganization,
  useOrganizationMembers,
  useAddMember,
  useRemoveMember,
  useUpdateMember,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { errorMessage } from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";

import { AddressDisplay, Notice } from "./grant-ui";
import { MemberIdentity } from "./organization-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

export function MembersManager({ organizationId }: { organizationId: string }) {
  const t = useTranslations();
  const session = useSession();
  const organization = useOrganization(organizationId);
  const members = useOrganizationMembers(organizationId);
  const addMember = useAddMember(organizationId);
  const updateMember = useUpdateMember(organizationId);
  const removeMember = useRemoveMember(organizationId);
  const [walletAddress, setWalletAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const [editingRole, setEditingRole] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    displayName: string;
  }>();

  if (!session.walletMatches) return null;
  if (organization.isPending || members.isPending)
    return (
      <Notice title={t("members.loading.title")}>
        <p>{t("members.loading.body")}</p>
      </Notice>
    );
  if (organization.isError || members.isError)
    return (
      <Notice title={t("members.error.title")} error>
        <p>{t("members.error.body")}</p>
      </Notice>
    );
  const isOwner = Boolean(organization.data?.membership.isOwner);
  const memberList = members.data ?? [];

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await addMember.mutateAsync({
        walletAddress,
        displayName,
        roleLabel: roleLabel.trim() || null,
      });
      setWalletAddress("");
      setDisplayName("");
      setRoleLabel("");
    } catch {
      // The server-safe mutation error is rendered below.
    }
  }

  function startEdit(member: (typeof memberList)[number]) {
    setEditingId(member.id);
    setEditingName(member.displayName);
    setEditingRole(member.roleLabel ?? "");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    try {
      await updateMember.mutateAsync({
        memberId: editingId,
        displayName: editingName,
        roleLabel: editingRole.trim() || null,
      });
      setEditingId(undefined);
    } catch {
      // The server-safe mutation error is rendered below.
    }
  }

  async function confirmRemove() {
    const target = memberToRemove;
    if (!target) return;
    try {
      await removeMember.mutateAsync(target.id);
      setMemberToRemove(undefined);
    } catch {
      // The server-safe mutation error is rendered below.
      setMemberToRemove(undefined);
    }
  }

  return (
    <div className="space-y-7">
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("members.add.title")}</CardTitle>
            <p className="pt-2 text-sm leading-6 text-muted-foreground">
              {t("members.add.lede")}
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => void add(event)}
            >
              <label className="space-y-2 md:col-span-2">
                <span className="block text-sm font-medium">
                  {t("members.field.wallet")}
                </span>
                <input
                  className="field font-mono"
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                  placeholder="0x…"
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-medium">
                  {t("members.field.displayName")}
                </span>
                <input
                  className="field"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={t("members.field.displayName.placeholder")}
                  maxLength={100}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-medium">
                  {t("members.field.role")}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t("members.field.optional")}
                  </span>
                </span>
                <input
                  className="field"
                  value={roleLabel}
                  onChange={(event) => setRoleLabel(event.target.value)}
                  placeholder={t("members.field.role.placeholder")}
                  maxLength={100}
                />
              </label>
              <div className="md:col-span-2">
                <Button type="submit" disabled={addMember.isPending}>
                  {addMember.isPending
                    ? t("members.add.pending")
                    : t("members.add.action")}
                </Button>
              </div>
              {addMember.isError && (
                <p
                  role="alert"
                  className="text-sm text-destructive md:col-span-2"
                >
                  {errorMessage(addMember.error, {
                    fallback: t("ui.error.requestFailed"),
                    rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
                  })}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("members.directory.title")}
          </CardTitle>
          <p className="pt-2 text-sm text-muted-foreground">
            {t(
              memberList.length === 1
                ? "members.directory.count.one"
                : "members.directory.count.other",
              { count: memberList.length },
            )}
          </p>
        </CardHeader>
        <CardContent>
          {!memberList.length ? (
            <p className="rounded-card border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              {t("members.directory.empty")}
            </p>
          ) : (
            <div className="space-y-3">
              {memberList.map((member) => (
                <div
                  key={member.id}
                  className="rounded-card border border-border bg-surface-1 p-4"
                >
                  {editingId === member.id ? (
                    <form
                      className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
                      onSubmit={(event) => void saveEdit(event)}
                    >
                      <label className="space-y-2">
                        <span className="block text-xs font-medium text-muted-foreground">
                          {t("members.field.displayName")}
                        </span>
                        <input
                          className="field"
                          value={editingName}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          maxLength={100}
                          required
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="block text-xs font-medium text-muted-foreground">
                          {t("members.field.role")}
                        </span>
                        <input
                          className="field"
                          value={editingRole}
                          onChange={(event) =>
                            setEditingRole(event.target.value)
                          }
                          maxLength={100}
                        />
                      </label>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={updateMember.isPending}
                        >
                          {updateMember.isPending
                            ? t("members.edit.saving")
                            : t("members.edit.save")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(undefined)}
                        >
                          {t("members.edit.cancel")}
                        </Button>
                      </div>
                      {updateMember.isError && (
                        <p
                          role="alert"
                          className="text-sm text-destructive md:col-span-3"
                        >
                          {errorMessage(updateMember.error, {
                            fallback: t("ui.error.requestFailed"),
                            rpcUnavailable: t(
                              "tx.error.rpcUnavailable",
                              NETWORK,
                            ),
                          })}
                        </p>
                      )}
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <MemberIdentity member={member} />
                      <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
                        <AddressDisplay
                          address={getAddress(member.walletAddress)}
                        />
                        {member.isOwner && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                            <span className="size-1.5 rounded-full bg-current" />
                            {t("members.owner")}
                          </span>
                        )}
                        {isOwner && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(member)}
                            >
                              {t("members.edit")}
                            </Button>
                            {!member.isOwner && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setMemberToRemove({
                                    id: member.id,
                                    displayName: member.displayName,
                                  })
                                }
                                disabled={removeMember.isPending}
                              >
                                {t("members.remove")}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {removeMember.isError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {errorMessage(removeMember.error, {
                fallback: t("ui.error.requestFailed"),
                rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
              })}
            </p>
          )}
        </CardContent>
      </Card>
      <AlertDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => {
          if (!open && !removeMember.isPending) setMemberToRemove(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("members.remove")}</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <span className="mb-1 block font-medium text-foreground">
                  {memberToRemove.displayName}
                </span>
              )}
              {t("members.removeConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              {t("members.edit.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMember.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmRemove();
              }}
            >
              {t("members.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
