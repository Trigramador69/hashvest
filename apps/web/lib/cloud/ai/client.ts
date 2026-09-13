import type { AiGrantDraftResult } from "./draft-service";

/**
 * Browser side of the AI draft endpoint (HAS-18).
 *
 * Mirrors `lib/cloud/organizations/client.ts`. The server answers with English
 * status messages like every other route here; the UI maps the status onto
 * `ai.error.*` so the reader sees their own language, and keeps the server's
 * message only as a last resort.
 */
export class AiApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "AiApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const aiApi = {
  async draftGrant(input: {
    prompt: string;
    locale: string;
    signal?: AbortSignal;
  }): Promise<AiGrantDraftResult> {
    const response = await fetch("/api/ai/grant-draft", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input.prompt, locale: input.locale }),
      signal: input.signal,
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const record = (body ?? {}) as Record<string, unknown>;

    if (!response.ok)
      throw new AiApiError(
        response.status,
        typeof record.error === "string"
          ? record.error
          : "The request failed. Please try again.",
        typeof record.retryAfterSeconds === "number"
          ? record.retryAfterSeconds
          : undefined,
      );

    return record.draft as AiGrantDraftResult;
  },
};
