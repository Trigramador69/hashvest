"use client";

import { useState, type FormEvent } from "react";
import { getAddress } from "viem";

import {
  useOrganization,
  useOrganizationMembers,
  useAddMember,
  useRemoveMember,
  useUpdateMember,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { errorMessage } from "@/lib/protocol/grants";

import { AddressDisplay, Notice } from "./grant-ui";
import { MemberIdentity } from "./organization-ui";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function MembersManager({ organizationId }: { organizationId: string }) {
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

  if (!session.walletMatches) return null;
  if (organization.isPending || members.isPending)
    return (
      <Notice title="Loading members">
        <p>Reading the organization directory…</p>
      </Notice>
    );
  if (organization.isError || members.isError)
    return (
      <Notice title="Members could not be loaded" error>
        <p>Check the workspace configuration and retry.</p>
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

  async function remove(memberId: string) {
    if (!window.confirm("Remove this member from the organization?")) return;
    try {
      await removeMember.mutateAsync(memberId);
    } catch {
      // The server-safe mutation error is rendered below.
    }
  }

  return (
    <div className="space-y-7">
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add a member</CardTitle>
            <p className="pt-2 text-sm leading-6 text-muted-foreground">
              Add a wallet to the organization directory. Role labels are
              presentation metadata only; GrantVault issuer, beneficiary, and
              reviewer permissions stay onchain.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => void add(event)}
            >
              <label className="space-y-2 md:col-span-2">
                <span className="block text-sm font-medium">
                  Wallet address
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
                <span className="block text-sm font-medium">Display name</span>
                <input
                  className="field"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Maria Rodriguez"
                  maxLength={100}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-medium">
                  Role/title{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </span>
                <input
                  className="field"
                  value={roleLabel}
                  onChange={(event) => setRoleLabel(event.target.value)}
                  placeholder="Treasury Reviewer"
                  maxLength={100}
                />
              </label>
              <div className="md:col-span-2">
                <Button type="submit" disabled={addMember.isPending}>
                  {addMember.isPending ? "Adding member…" : "Add member"}
                </Button>
              </div>
              {addMember.isError && (
                <p
                  role="alert"
                  className="text-sm text-destructive md:col-span-2"
                >
                  {errorMessage(addMember.error)}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Member directory</CardTitle>
          <p className="pt-2 text-sm text-muted-foreground">
            {memberList.length} {memberList.length === 1 ? "wallet" : "wallets"}{" "}
            in this workspace.
          </p>
        </CardHeader>
        <CardContent>
          {!memberList.length ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No members yet.
            </p>
          ) : (
            <div className="space-y-3">
              {memberList.map((member) => (
                <div key={member.id} className="rounded-xl border p-4">
                  {editingId === member.id ? (
                    <form
                      className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
                      onSubmit={(event) => void saveEdit(event)}
                    >
                      <label className="space-y-2">
                        <span className="block text-xs font-medium text-muted-foreground">
                          Display name
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
                          Role/title
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
                          {updateMember.isPending ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(undefined)}
                        >
                          Cancel
                        </Button>
                      </div>
                      {updateMember.isError && (
                        <p
                          role="alert"
                          className="text-sm text-destructive md:col-span-3"
                        >
                          {errorMessage(updateMember.error)}
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
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            Owner
                          </span>
                        )}
                        {isOwner && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(member)}
                            >
                              Edit
                            </Button>
                            {!member.isOwner && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void remove(member.id)}
                                disabled={removeMember.isPending}
                              >
                                Remove
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
              {errorMessage(removeMember.error)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
