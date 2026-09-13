import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/shared/routes";

export default async function LegacyOrganizationNewGrantPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  redirect(appRoutes.organizationNewGrant(organizationId));
}
