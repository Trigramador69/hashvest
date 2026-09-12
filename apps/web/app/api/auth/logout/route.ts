import { clearSessionCookie } from "@/lib/cloud/auth/session";
import { apiErrorResponse, assertSameOrigin } from "@/lib/cloud/api-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
