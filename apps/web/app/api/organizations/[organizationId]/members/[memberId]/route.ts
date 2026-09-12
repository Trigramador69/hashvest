import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import { removeMember, updateMember } from "@/lib/cloud/organizations/server";
import {
  parseMemberUpdateInput,
  validateUuid,
} from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ organizationId: string; memberId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { organizationId, memberId } = await context.params;
    return Response.json({
      member: await updateMember(
        validateUuid(organizationId),
        validateUuid(memberId, "Member ID"),
        parseMemberUpdateInput(await readJson(request)),
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ organizationId: string; memberId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { organizationId, memberId } = await context.params;
    await removeMember(
      validateUuid(organizationId),
      validateUuid(memberId, "Member ID"),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
