"use client";

import { use } from "react";

import { OrganizationHeader } from "@/components/organization-ui";
import { TemplatesManager } from "@/components/templates-manager";

export default function OrganizationTemplatesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return (
    <div className="space-y-5">
      <OrganizationHeader organizationId={organizationId} />
      <TemplatesManager organizationId={organizationId} />
    </div>
  );
}
