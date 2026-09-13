"use client";

import { use } from "react";

import { MembersManager } from "@/components/members-manager";
import { OrganizationHeader } from "@/components/organization-ui";

export default function OrganizationMembersPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return (
    <div className="space-y-5">
      <OrganizationHeader organizationId={organizationId} />
      <MembersManager organizationId={organizationId} />
    </div>
  );
}
