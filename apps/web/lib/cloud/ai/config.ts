import "server-only";

import { AI_MAX_OUTPUT_TOKENS } from "../../shared/ai-grant-draft/schema";

/**
 * AI provider configuration (HAS-16).
 *
 * The only module permitted to read `AI_API_KEY` — `scripts/check-boundary.mjs`
 * fails CI if the name appears anywhere else, and would fail it outright for a
 * `NEXT_PUBLIC_` prefix. Everything downstream receives an already-configured
 * object, so no other file can leak the key into a bundle, a log line, or an
 * error message.
 *
 * The provider is optional by design. `resolveAiProvider()` returns `null`
 * rather than throwing when no key is set, because HAS-16 requires the
 * baseline demo to work without one: the caller falls back to the offline
 * drafter instead of showing an error.
 *
 * There is no provider SDK. Every endpoint the product targets — Groq, xAI,
 * OpenRouter, DeepSeek, Zhipu, and a local Ollama or LM Studio server — speaks
 * the same OpenAI-compatible `/chat/completions` shape, so switching provider
 * is two environment variables and no code.
 */

export type AiProviderConfig = {
  /** Base URL without a trailing slash, e.g. `https://api.groq.com/openai/v1`. */
  baseUrl: string;
  model: string;
  apiKey: string;
  /** Output ceiling for one draft. See AI_MAX_OUTPUT_TOKENS for why it moves. */
  maxOutputTokens: number;
};

/**
 * Groq is the default: it is the endpoint the demo is rehearsed against, it
 * has a free tier, and `gpt-oss-20b` is measured to honour
 * `response_format: json_schema` at the default output ceiling. A default
 * nobody on the team holds a key for would be a default that is never
 * exercised. See the provider matrix in docs/ai-grant-builder.md.
 */
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

/** Ignore a non-numeric or nonsensical override rather than failing a request. */
function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value?.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveAiProvider(): AiProviderConfig | null {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    baseUrl: (process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    ),
    model: process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
    apiKey,
    maxOutputTokens: positiveInteger(
      process.env.AI_MAX_TOKENS,
      AI_MAX_OUTPUT_TOKENS,
    ),
  };
}

/**
 * Whether a provider is configured, without handing the key to the caller.
 * Used by the route to report capability, never to gate validation.
 */
export function hasAiProvider(): boolean {
  return resolveAiProvider() !== null;
}
