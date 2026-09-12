import "server-only";

import { AuthConfigurationError } from "@/lib/cloud/auth/session";
import { ServerConfigurationError } from "@/lib/cloud/supabase-server";
import { InputValidationError } from "@/lib/cloud/organizations/validation";
import { getApplicationOrigin } from "@/lib/cloud/auth/siwe";
import { ApiError } from "@/lib/shared/api-error";

export { ApiError };

export async function readJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 100_000)
    throw new ApiError(413, "Request body is too large.");
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}

export function assertSameOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site")
    throw new ApiError(403, "Cross-origin request rejected.");
  if (requestOrigin && requestOrigin !== getApplicationOrigin(request).origin)
    throw new ApiError(403, "Cross-origin request rejected.");
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError || error instanceof InputValidationError)
    return Response.json(
      { error: error.message },
      { status: error instanceof ApiError ? error.status : 400 },
    );
  if (
    error instanceof AuthConfigurationError ||
    error instanceof ServerConfigurationError
  )
    return Response.json({ error: error.message }, { status: 503 });
  return Response.json(
    { error: "The server could not complete this request." },
    { status: 500 },
  );
}
