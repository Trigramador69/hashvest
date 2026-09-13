/**
 * The OpenAI-compatible provider call (HAS-16).
 *
 * Deliberately dependency-free and configuration-injected, the same split the
 * repository already uses for `auth/siwe.ts` vs `auth/siwe-core.ts`: the
 * secret is read only in `./config.ts`, which carries `server-only`, and this
 * module receives an already-configured object. That is what makes the
 * failure matrix testable — every case below is exercised with an injected
 * `fetch` and no network.
 *
 * The API key never appears in a thrown message, a returned value, or a log
 * line. Neither does the provider's response body: an upstream error page can
 * contain anything, including the request it echoes back.
 */

import {
  buildSystemPrompt,
  buildUserPrompt,
} from "../../shared/ai-grant-draft/prompt";
import {
  AI_GRANT_DRAFT_JSON_SCHEMA,
  AI_MAX_OUTPUT_TOKENS,
  AI_REQUEST_TIMEOUT_MS,
  AI_TEMPERATURE,
} from "../../shared/ai-grant-draft/schema";
import type { Locale } from "../../shared/i18n/locales";
import type { AiProviderConfig } from "./config";

/** Why a call failed, in the terms the UI has copy for. */
export type AiProviderFailure =
  "unauthorized" | "rate_limited" | "unavailable" | "timeout" | "malformed";

export class AiProviderError extends Error {
  readonly reason: AiProviderFailure;

  constructor(reason: AiProviderFailure) {
    // Fixed text per reason: an upstream body may quote the request back.
    super(`The AI provider call failed: ${reason}.`);
    this.name = "AiProviderError";
    this.reason = reason;
  }
}

export type AiProviderRequest = {
  config: AiProviderConfig;
  /** Must already have been through `redactPrompt`. */
  prompt: string;
  locale: Locale;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

function failureForStatus(status: number): AiProviderFailure {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 429) return "rate_limited";
  return "unavailable";
}

/**
 * Reads the model's text out of a chat completion.
 *
 * Providers disagree on whether `content` is a string or a list of parts, and
 * some wrap the JSON in a fenced code block despite the schema. Both are
 * normal enough to handle here rather than to fail on.
 */
function readContent(payload: unknown): string {
  if (typeof payload !== "object" || payload === null)
    throw new AiProviderError("malformed");
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices.length)
    throw new AiProviderError("malformed");
  const content = (choices[0] as { message?: { content?: unknown } })?.message
    ?.content;

  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((part) =>
              typeof part === "object" && part !== null
                ? String((part as { text?: unknown }).text ?? "")
                : "",
            )
            .join("")
        : "";

  const trimmed = text.trim();
  if (!trimmed) throw new AiProviderError("malformed");
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

/**
 * Asks the provider for a draft and returns its raw JSON text.
 *
 * The text is deliberately *not* parsed here. Parsing and validation belong to
 * `parseAiGrantDraft`, so there is exactly one place that decides what a draft
 * is, whether it came from a provider or from the offline drafter.
 */
export async function requestAiGrantDraft({
  config,
  prompt,
  locale,
  fetchImpl = fetch,
  signal,
}: AiProviderRequest): Promise<string> {
  const timeout = AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS);
  const abort = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: AI_TEMPERATURE,
        max_tokens: AI_MAX_OUTPUT_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: AI_GRANT_DRAFT_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: buildSystemPrompt(locale) },
          { role: "user", content: buildUserPrompt(prompt) },
        ],
      }),
      signal: abort,
    });
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new AiProviderError(
      abort.aborted || (error as Error)?.name === "AbortError"
        ? "timeout"
        : "unavailable",
    );
  }

  if (!response.ok)
    throw new AiProviderError(failureForStatus(response.status));

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AiProviderError("malformed");
  }
  return readContent(payload);
}
