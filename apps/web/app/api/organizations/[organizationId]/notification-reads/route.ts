import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import {
  listNotificationReads,
  markNotificationsRead,
} from "@/lib/cloud/organizations/notification-reads-server";
import {
  parseNotificationReadInput,
  validateUuid,
} from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    return Response.json(
      { reads: await listNotificationReads(validateUuid(organizationId)) },
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
    const reads = parseNotificationReadInput(await readJson(request));
    return Response.json(
      {
        reads: await markNotificationsRead(validateUuid(organizationId), reads),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
