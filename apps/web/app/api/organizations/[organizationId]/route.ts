import { apiErrorResponse } from "@/lib/api-server";
import { getOrganization } from "@/lib/organizations/server";
import { validateUuid } from "@/lib/organizations/validation";

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
