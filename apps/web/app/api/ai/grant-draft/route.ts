import {
  apiErrorResponse,
  ApiError,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import { resolveAiProvider } from "@/lib/cloud/ai/config";
import {
  AiRateLimitError,
  buildGrantDraft,
} from "@/lib/cloud/ai/draft-service";
import { readSession } from "@/lib/cloud/auth/session";

export const runtime = "nodejs";

/**
 * Drafts an editable grant template from a short description (HAS-16/HAS-18).
 *
 * A thin adapter over `buildGrantDraft`, which holds the pipeline and the
 * tests. The session is required for two reasons that are not authorization:
 * it is the rate-limit identity, and it keeps an unauthenticated caller from
 * spending a paid provider budget. It grants nothing — the response is a
 * suggestion the user still has to edit, confirm, and sign for.
 *
 * Nothing here is persisted. The prompt lives for the length of this call.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const session = await readSession();
    if (!session) throw new ApiError(401, "Sign in to draft a grant.");

    const body = (await readJson(request)) as Record<string, unknown>;
    const draft = await buildGrantDraft({
      prompt: body?.prompt,
      locale: body?.locale,
      wallet: session.walletAddress,
      config: resolveAiProvider(),
      signal: request.signal,
    });

    return Response.json(
      { draft },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AiRateLimitError)
      return Response.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    return apiErrorResponse(error);
  }
}
