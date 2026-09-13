import { assertSameOrigin } from "@/lib/cloud/api-server";
import { resolveAiProvider } from "@/lib/cloud/ai/config";
import { aiToolError, readAiBody } from "@/lib/cloud/ai/route-utils";
import { buildTemplateDraft } from "@/lib/cloud/ai/template-service";
import { requireOrganizationOwner } from "@/lib/cloud/organizations/server";

export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { organizationId } = await context.params;
    const access = await requireOrganizationOwner(organizationId);
    const body = await readAiBody(request);
    const result = await buildTemplateDraft({
      prompt: body.prompt,
      locale: body.locale,
      wallet: access.session.walletAddress,
      config: resolveAiProvider(),
      signal: request.signal,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return aiToolError(error);
  }
}
