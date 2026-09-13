import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/shared/routes";

export default async function LegacyOrganizationTemplatesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  redirect(appRoutes.organizationTemplates(organizationId));
}
