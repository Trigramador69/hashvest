import { clearSessionCookie } from "@/lib/auth/session";
import { apiErrorResponse, assertSameOrigin } from "@/lib/api-server";

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
