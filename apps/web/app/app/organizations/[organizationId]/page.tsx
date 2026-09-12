"use client";

import { use } from "react";

import { OrganizationHeader } from "@/components/organization-ui";
import { OrganizationOverview } from "@/components/organization-overview";

export default function OrganizationOverviewPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return (
    <div className="space-y-8">
      <OrganizationHeader organizationId={organizationId} />
      <OrganizationOverview organizationId={organizationId} />
    </div>
  );
}
