"use client";

import { use } from "react";

import { NewGrant } from "@/app/grants/new/page";
import { OrganizationHeader } from "@/components/organization-ui";

export default function OrganizationNewGrantPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return (
    <div className="space-y-5">
      <OrganizationHeader organizationId={organizationId} />
      <NewGrant organizationId={organizationId} />
    </div>
  );
}
