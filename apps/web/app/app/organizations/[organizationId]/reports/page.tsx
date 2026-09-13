"use client";

import { use } from "react";

import { OrganizationReportView } from "@/components/organization-report";
import { OrganizationHeader } from "@/components/organization-ui";

export default function OrganizationReportsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return (
    <div className="space-y-5">
      <OrganizationHeader organizationId={organizationId} />
      <OrganizationReportView organizationId={organizationId} />
    </div>
  );
}
