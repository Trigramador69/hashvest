import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import {
  createTemplate,
  listTemplates,
} from "@/lib/cloud/organizations/server";
import {
  parseOrganizationTemplateInput,
  validateUuid,
} from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

/**
 * Any member. `?include=archived` also returns archived templates, which only
 * grant provenance needs. See docs/organization-templates.md.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    const includeArchived =
      new URL(request.url).searchParams.get("include") === "archived";
    return Response.json(
      {
        templates: await listTemplates(validateUuid(organizationId), {
          includeArchived,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Owner only. */
export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { organizationId } = await context.params;
    const content = parseOrganizationTemplateInput(await readJson(request));
    return Response.json(
      { template: await createTemplate(validateUuid(organizationId), content) },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
