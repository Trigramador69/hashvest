"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  useOrganization,
  useOrganizationMembers,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { errorMessage, shortAddress } from "@/lib/protocol/grants";
import type { OrganizationMember } from "@/lib/cloud/organizations/types";

import { Notice, PageHeading } from "./grant-ui";
import { Button, buttonVariants } from "./ui/button";
import { WorkspaceAccessNotice } from "./workspace-access";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(1, "?");
}

export function MemberIdentity({ member }: { member: OrganizationMember }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/30 bg-[rgba(87,217,139,.08)] font-mono text-xs text-primary">
        {initials(member.displayName)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium">{member.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {member.roleLabel ?? "Member"}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {shortAddress(member.walletAddress)}
        </p>
      </div>
    </div>
  );
}

export function MemberPicker({
  label,
  hint,
  members,
  memberId,
  addressValue,
  onMemberChange,
  onAddressChange,
  external,
  onExternalChange,
}: {
  label: string;
  hint: string;
  members: OrganizationMember[] | undefined;
  memberId: string;
  addressValue: string;
  onMemberChange: (memberId: string) => void;
  onAddressChange: (address: string) => void;
  external: boolean;
  onExternalChange: (external: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block space-y-2">
        <span className="text-sm font-medium">{label}</span>
        {!external ? (
          <select
            className="field"
            value={memberId}
            onChange={(event) => {
              const selectedId = event.target.value;
              onMemberChange(selectedId);
              const member = members?.find((item) => item.id === selectedId);
              if (member) onAddressChange(member.walletAddress);
            }}
            disabled={!members?.length}
          >
            <option value="">
              {members?.length
                ? `Choose a ${label.toLowerCase()}`
                : "No members available"}
            </option>
            {members?.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
                {member.roleLabel ? ` — ${member.roleLabel}` : ""}
                {` · ${shortAddress(member.walletAddress)}`}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="field font-mono"
            value={addressValue}
            onChange={(event) => onAddressChange(event.target.value.trim())}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </label>
      <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      <button
        type="button"
        className="text-xs font-medium text-primary underline underline-offset-4"
        onClick={() => {
          const nextExternal = !external;
          onExternalChange(nextExternal);
          if (!nextExternal) {
            const member = members?.find((item) => item.id === memberId);
            if (member) onAddressChange(member.walletAddress);
          }
        }}
      >
        {external ? "Choose from organization members" : "Use external wallet"}
      </button>
    </div>
  );
}

export function WorkspaceTabs({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const tabs = [
    ["Overview", `/app/organizations/${organizationId}`],
    ["Grants", `/app/organizations/${organizationId}/grants`],
    ["Members", `/app/organizations/${organizationId}/members`],
  ] as const;
  return (
    <nav
      aria-label="Organization navigation"
      className="flex flex-wrap gap-1 border-b border-border-soft pb-3"
    >
      {tabs.map(([label, href]) => (
        <Link
          key={label}
          href={href}
          className={`rounded-control px-3 py-2 font-mono text-xs ${pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function OrganizationHeader({
  organizationId,
}: {
  organizationId: string;
}) {
  const session = useSession();
  const organization = useOrganization(organizationId);
  if (!session.walletMatches) return <WorkspaceAccessNotice />;
  if (organization.isPending)
    return (
      <Notice title="Loading workspace">
        <p>Reading organization context…</p>
      </Notice>
    );
  if (organization.isError || !organization.data)
    return (
      <Notice title="Workspace could not be loaded" error>
        <p>{errorMessage(organization.error)}</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => void organization.refetch()}
        >
          Retry
        </Button>
      </Notice>
    );
  const { organization: data } = organization.data;
  return (
    <div className="space-y-5">
      <Link className="font-mono text-xs text-primary hover:underline" href="/app">
        ← Organizations
      </Link>
      <PageHeading
        eyebrow="HashVest organization"
        title={data.name}
        action={
          <Link
            className={buttonVariants({ size: "sm" })}
            href={`/app/organizations/${organizationId}/grants/new`}
          >
            Create grant <span aria-hidden>+</span>
          </Link>
        }
      >
        <p>
          {data.memberCount} {data.memberCount === 1 ? "member" : "members"} ·{" "}
          {data.grantCount} {data.grantCount === 1 ? "grant" : "grants"}
        </p>
      </PageHeading>
      <WorkspaceTabs organizationId={organizationId} />
    </div>
  );
}

export function MembersPreview({ organizationId }: { organizationId: string }) {
  const members = useOrganizationMembers(organizationId);
  if (members.isPending)
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  if (members.isError)
    return (
      <p className="text-sm text-destructive">Members could not be loaded.</p>
    );
  if (!members.data?.length)
    return <p className="text-sm text-muted-foreground">No members yet.</p>;
  return (
    <div className="space-y-4">
      {members.data.slice(0, 4).map((member) => (
        <MemberIdentity key={member.id} member={member} />
      ))}
      {members.data.length > 4 && (
        <p className="text-xs text-muted-foreground">
          +{members.data.length - 4} more members
        </p>
      )}
    </div>
  );
}
