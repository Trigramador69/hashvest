import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/shared/routes";

export default async function LegacyOrganizationOverviewPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  redirect(appRoutes.organization(organizationId));
}
