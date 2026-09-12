"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  useOrganization,
  useOrganizationMembers,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import { errorMessage, shortAddress } from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";
import type { OrganizationMember } from "@/lib/cloud/organizations/types";

import { Notice, PageHeading } from "./grant-ui";
import { Button } from "./ui/button";
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
  const t = useTranslations();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials(member.displayName)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium">{member.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {member.roleLabel ?? t("member.defaultRole")}
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
  choosePlaceholder,
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
  /** Empty-option text. Passed in because it cannot be derived from `label`
   *  in every language. */
  choosePlaceholder: string;
  members: OrganizationMember[] | undefined;
  memberId: string;
  addressValue: string;
  onMemberChange: (memberId: string) => void;
  onAddressChange: (address: string) => void;
  external: boolean;
  onExternalChange: (external: boolean) => void;
}) {
  const t = useTranslations();
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
              {members?.length ? choosePlaceholder : t("picker.noMembers")}
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
        {external ? t("picker.useMembers") : t("picker.useExternal")}
      </button>
    </div>
  );
}

export function WorkspaceTabs({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const t = useTranslations();
  const tabs = [
    ["overview", `/app/organizations/${organizationId}`],
    ["grants", `/app/organizations/${organizationId}/grants`],
    ["members", `/app/organizations/${organizationId}/members`],
  ] as const;
  return (
    <nav
      aria-label={t("workspace.nav.label")}
      className="flex flex-wrap gap-2 border-b pb-3"
    >
      {tabs.map(([id, href]) => (
        <Link
          key={id}
          href={href}
          className={`rounded-md px-3 py-2 text-sm font-medium ${pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
        >
          {t(`workspace.tab.${id}`)}
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
  const t = useTranslations();
  const session = useSession();
  const organization = useOrganization(organizationId);
  if (!session.walletMatches) return <WorkspaceAccessNotice />;
  if (organization.isPending)
    return (
      <Notice title={t("workspace.loading.title")}>
        <p>{t("workspace.loading.body")}</p>
      </Notice>
    );
  if (organization.isError || !organization.data)
    return (
      <Notice title={t("workspace.error.title")} error>
        <p>{errorMessage(organization.error)}</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => void organization.refetch()}
        >
          {t("workspace.retry")}
        </Button>
      </Notice>
    );
  const { organization: data } = organization.data;
  return (
    <div className="space-y-5">
      <Link className="text-sm font-medium text-primary" href="/app">
        <span aria-hidden>←</span> {t("workspace.backToOrganizations")}
      </Link>
      <PageHeading
        eyebrow={t("workspace.eyebrow")}
        title={data.name}
        action={
          <Link
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            href={`/app/organizations/${organizationId}/grants/new`}
          >
            {t("workspace.createGrant")} <span aria-hidden>+</span>
          </Link>
        }
      >
        <p>
          {t(
            data.memberCount === 1
              ? "workspace.counts.member"
              : "workspace.counts.members",
            { count: data.memberCount },
          )}{" "}
          ·{" "}
          {t(
            data.grantCount === 1
              ? "workspace.counts.grant"
              : "workspace.counts.grants",
            { count: data.grantCount },
          )}
        </p>
      </PageHeading>
      <WorkspaceTabs organizationId={organizationId} />
    </div>
  );
}

export function MembersPreview({ organizationId }: { organizationId: string }) {
  const t = useTranslations();
  const members = useOrganizationMembers(organizationId);
  if (members.isPending)
    return (
      <p className="text-sm text-muted-foreground">
        {t("workspace.members.loading")}
      </p>
    );
  if (members.isError)
    return (
      <p className="text-sm text-destructive">{t("workspace.members.error")}</p>
    );
  if (!members.data?.length)
    return (
      <p className="text-sm text-muted-foreground">
        {t("workspace.members.empty")}
      </p>
    );
  return (
    <div className="space-y-4">
      {members.data.slice(0, 4).map((member) => (
        <MemberIdentity key={member.id} member={member} />
      ))}
      {members.data.length > 4 && (
        <p className="text-xs text-muted-foreground">
          {t("workspace.members.more", {
            count: members.data.length - 4,
          })}
        </p>
      )}
    </div>
  );
}
