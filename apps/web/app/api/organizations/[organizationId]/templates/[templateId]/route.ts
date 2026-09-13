import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import {
  archiveTemplate,
  getTemplate,
  updateTemplate,
} from "@/lib/cloud/organizations/server";
import {
  parseOrganizationTemplateUpdateInput,
  validateUuid,
} from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

type TemplateRouteContext = {
  params: Promise<{ organizationId: string; templateId: string }>;
};

/** Any member, typically to apply the template to the wizard. */
export async function GET(_request: Request, context: TemplateRouteContext) {
  try {
    const { organizationId, templateId } = await context.params;
    return Response.json(
      {
        template: await getTemplate(
          validateUuid(organizationId),
          validateUuid(templateId, "Template ID"),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Owner only. The body names the version the edit was based on. */
export async function PATCH(request: Request, context: TemplateRouteContext) {
  try {
    assertSameOrigin(request);
    const { organizationId, templateId } = await context.params;
    const { content, expectedVersion } = parseOrganizationTemplateUpdateInput(
      await readJson(request),
    );
    return Response.json({
      template: await updateTemplate(
        validateUuid(organizationId),
        validateUuid(templateId, "Template ID"),
        content,
        expectedVersion,
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Owner only. Archives the template; no grant is touched. */
export async function DELETE(request: Request, context: TemplateRouteContext) {
  try {
    assertSameOrigin(request);
    const { organizationId, templateId } = await context.params;
    await archiveTemplate(
      validateUuid(organizationId),
      validateUuid(templateId, "Template ID"),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
