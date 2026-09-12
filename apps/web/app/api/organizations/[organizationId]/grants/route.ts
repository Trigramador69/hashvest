import { apiErrorResponse, assertSameOrigin, readJson } from "@/lib/api-server";
import { associateGrant, listGrants } from "@/lib/organizations/server";
import {
  parseOrganizationGrantInput,
  validateUuid,
} from "@/lib/organizations/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    return Response.json(
      { grants: await listGrants(validateUuid(organizationId)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { organizationId } = await context.params;
    return Response.json(
      {
        grant: await associateGrant(
          validateUuid(organizationId),
          parseOrganizationGrantInput(await readJson(request)),
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
