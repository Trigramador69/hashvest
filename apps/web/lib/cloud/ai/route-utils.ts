import "server-only";
import { apiErrorResponse, ApiError } from "../api-server";
import { AiRateLimitError } from "./draft-service";

/** Enforce bytes even when Content-Length is absent (chunked requests). */
export async function readAiBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Invalid request.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4096) {
        await reader.cancel();
        throw new ApiError(413, "Request too large.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Invalid request.");
  } finally {
    reader.releaseLock();
  }
}

export function aiToolError(error: unknown) {
  const response =
    error instanceof AiRateLimitError
      ? Response.json(
          { error: "rate_limited", retryAfterSeconds: error.retryAfterSeconds },
          {
            status: 429,
            headers: { "Retry-After": String(error.retryAfterSeconds) },
          },
        )
      : apiErrorResponse(error);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
