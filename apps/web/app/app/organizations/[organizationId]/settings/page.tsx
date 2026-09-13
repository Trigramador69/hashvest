"use client";

import { use } from "react";

import { OrganizationSettings } from "@/components/organization-overview";
import { OrganizationHeader } from "@/components/organization-ui";

export default function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return (
    <div className="space-y-5">
      <OrganizationHeader organizationId={organizationId} />
      <OrganizationSettings organizationId={organizationId} />
    </div>
  );
}
