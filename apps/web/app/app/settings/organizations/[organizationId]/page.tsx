"use client";

import { use } from "react";

import { OrganizationOverview } from "@/components/organization-overview";
import { OrganizationHeader } from "@/components/organization-ui";

export default function OrganizationOverviewPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return (
    <div className="space-y-5">
      <OrganizationHeader organizationId={organizationId} />
      <OrganizationOverview organizationId={organizationId} />
    </div>
  );
}
