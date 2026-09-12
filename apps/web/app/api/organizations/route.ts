import { apiErrorResponse, assertSameOrigin, readJson } from "@/lib/cloud/api-server";
import {
  createOrganization,
  listOrganizations,
} from "@/lib/cloud/organizations/server";
import { parseOrganizationInput } from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(
      { organizations: await listOrganizations() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = parseOrganizationInput(await readJson(request));
    return Response.json(
      { organization: await createOrganization(input) },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
