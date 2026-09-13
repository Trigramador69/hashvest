"use client";

import { use } from "react";

import { OrganizationGrants } from "@/components/organization-overview";
import { OrganizationHeader } from "@/components/organization-ui";

export default function OrganizationGrantsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return (
    <div className="space-y-5">
      <OrganizationHeader organizationId={organizationId} />
      <OrganizationGrants organizationId={organizationId} />
    </div>
  );
}
