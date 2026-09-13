import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import {
  getOrganizationSponsorshipPolicy,
  updateOrganizationSponsorshipPolicy,
} from "@/lib/cloud/sponsored-claims/server";
import { parseSponsorshipPolicyInput } from "@/lib/cloud/sponsored-claims/validation";
import { validateUuid } from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    return Response.json(
      await getOrganizationSponsorshipPolicy(validateUuid(organizationId)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { organizationId } = await context.params;
    return Response.json(
      await updateOrganizationSponsorshipPolicy(
        validateUuid(organizationId),
        parseSponsorshipPolicyInput(await readJson(request)),
      ),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
