import "server-only";

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
 * There is no provider SDK. Every endpoint the product targets — xAI,
 * OpenRouter, DeepSeek, Zhipu, and a local Ollama or LM Studio server — speaks
 * the same OpenAI-compatible `/chat/completions` shape, so switching provider
 * is two environment variables and no code.
 */

export type AiProviderConfig = {
  /** Base URL without a trailing slash, e.g. `https://api.x.ai/v1`. */
  baseUrl: string;
  model: string;
  apiKey: string;
};

/** xAI's Grok is the default: it is the one the demo is rehearsed against. */
const DEFAULT_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.6";

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
  };
}

/**
 * Whether a provider is configured, without handing the key to the caller.
 * Used by the route to report capability, never to gate validation.
 */
export function hasAiProvider(): boolean {
  return resolveAiProvider() !== null;
}
