import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/shared/routes";

export default async function LegacyOrganizationMembersPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  redirect(appRoutes.organizationMembers(organizationId));
}
