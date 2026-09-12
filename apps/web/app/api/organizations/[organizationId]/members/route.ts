import { apiErrorResponse, assertSameOrigin, readJson } from "@/lib/cloud/api-server";
import { addMember, listMembers } from "@/lib/cloud/organizations/server";
import { parseMemberInput, validateUuid } from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    return Response.json(
      { members: await listMembers(validateUuid(organizationId)) },
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
    const member = parseMemberInput(await readJson(request));
    return Response.json(
      { member: await addMember(validateUuid(organizationId), member) },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
