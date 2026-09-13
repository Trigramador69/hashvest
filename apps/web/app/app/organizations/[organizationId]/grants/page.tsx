import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/shared/routes";

export default async function LegacyOrganizationGrantsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  redirect(appRoutes.organizationGrants(organizationId));
}
