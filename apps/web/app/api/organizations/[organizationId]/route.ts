import { apiErrorResponse } from "@/lib/cloud/api-server";
import { getOrganization } from "@/lib/cloud/organizations/server";
import { validateUuid } from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    return Response.json(await getOrganization(validateUuid(organizationId)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
