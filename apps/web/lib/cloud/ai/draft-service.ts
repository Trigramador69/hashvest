/**
 * The AI Grant Builder pipeline (HAS-16).
 *
 * One function, every dependency injected, so the whole failure matrix is
 * testable without a network: no provider configured, provider down,
 * rate-limited, unauthorized, malformed output, prompt injection. The route
 * handler above it is a thin adapter, which is the only testable seam this
 * repository has for HTTP work.
 *
 * Retention is zero. The prompt exists as a local variable for the length of
 * one call and is never written to Supabase, to a log, or to an error message.
 * The rate limiter counts requests in memory and stores nothing about them.
 *
 * The order below is the privacy boundary, and it only reads one way:
 *
 *   redact → limit → provider (or offline) → parse → normalize → validate
 *
 * A provider never sees an address or a secret, and its answer never reaches
 * the wizard without passing the same `assertValidPreset` gate the
 * hand-written catalog passes.
 */

import { localizeGrantPreset } from "../../shared/grant-presets/localize";
import {
  GRANT_PRESETS,
  type GrantPreset,
} from "../../shared/grant-presets/presets";
import { heuristicDraft } from "../../shared/ai-grant-draft/heuristic-draft";
import {
  normalizeAiDraft,
  type AiAdjustment,
} from "../../shared/ai-grant-draft/normalize";
import { parseAiGrantDraft } from "../../shared/ai-grant-draft/parse-draft";
import {
  redactPrompt,
  type RedactionKind,
} from "../../shared/ai-grant-draft/redact";
import { scanRequest } from "../../shared/ai-grant-draft/request-scan";
import {
  AI_PROMPT_MAX_LENGTH,
  AI_PROMPT_MIN_LENGTH,
} from "../../shared/ai-grant-draft/schema";
import {
  createOptionalTranslator,
  getMessages,
} from "../../shared/i18n/dictionary";
import { isLocale, type Locale } from "../../shared/i18n/locales";
import { ApiError } from "../../shared/api-error";
import { InputValidationError } from "../organizations/validation";
import type { AiProviderConfig } from "./config";
import { AiProviderError, requestAiGrantDraft } from "./provider";
import { aiRateLimiter, type AiRateLimiter } from "./rate-limit";

/** Fields the wizard will not accept from a draft, ever. Rendered as `ai.confirm.*`. */
export type AiConfirmationCode = "beneficiary" | "reviewer" | "token";

export type AiGrantDraftResult = {
  preset: GrantPreset;
  /** Every non-obvious choice the draft made, in the reader's locale. */
  assumptions: string[];
  /** What the draft could not honour, in the reader's locale. */
  unsupported: string[];
  /** Machine codes the UI resolves as `ai.adjustment.*`. */
  adjustments: AiAdjustment[];
  /** Identities only a human can pick. */
  needsConfirmation: AiConfirmationCode[];
  source: "model" | "fallback";
};

export class AiRateLimitError extends ApiError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(429, "Too many AI draft requests. Try again shortly.");
    this.name = "AiRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type BuildGrantDraftOptions = {
  prompt: unknown;
  locale: unknown;
  /** Lowercased wallet address from the SIWE session. The rate-limit key. */
  wallet: string;
  config: AiProviderConfig | null;
  fetchImpl?: typeof fetch;
  limiter?: AiRateLimiter;
  now?: number;
  signal?: AbortSignal;
};

/** Redaction findings become notes the user can read, not silent removals. */
const REDACTION_CODES: Record<RedactionKind, AiAdjustment["code"]> = {
  address: "requestAddressIgnored",
  "hex-value": "requestAddressIgnored",
  "secret-like": "requestSecretIgnored",
  "private-key": "requestSecretIgnored",
  mnemonic: "requestSecretIgnored",
};

export function parseAiDraftRequest(body: unknown): {
  prompt: string;
  locale: Locale;
} {
  const record = (body ?? {}) as Record<string, unknown>;
  if (typeof record.prompt !== "string")
    throw new InputValidationError("Prompt must be text.");

  const prompt = record.prompt.trim();
  if (prompt.length < AI_PROMPT_MIN_LENGTH)
    throw new InputValidationError(
      `Prompt must be at least ${AI_PROMPT_MIN_LENGTH} characters.`,
    );
  if (prompt.length > AI_PROMPT_MAX_LENGTH)
    throw new InputValidationError(
      `Prompt must be at most ${AI_PROMPT_MAX_LENGTH} characters.`,
    );

  // An unknown locale falls back rather than failing: the reader's language is
  // presentation state, never a reason to refuse a request.
  return { prompt, locale: isLocale(record.locale) ? record.locale : "en" };
}

function localizedCatalog(locale: Locale): GrantPreset[] {
  const tOptional = createOptionalTranslator(getMessages(locale));
  return GRANT_PRESETS.map((preset) => localizeGrantPreset(preset, tOptional));
}

function confirmationsFor(preset: GrantPreset): AiConfirmationCode[] {
  // A draft never names an identity, so every grant needs these picked by
  // hand before the wizard will let a wallet be asked for anything.
  return preset.reviewerRequired
    ? ["beneficiary", "reviewer", "token"]
    : ["beneficiary", "token"];
}

/**
 * Builds a validated, editable draft for one request.
 *
 * Never throws for a provider problem: an unavailable, unauthorized, slow or
 * incoherent provider falls through to the offline drafter, because HAS-16
 * requires a usable result in all of those cases. It throws only for input the
 * user can fix (`InputValidationError`) or a budget they have spent
 * (`AiRateLimitError`).
 */
export async function buildGrantDraft(
  options: BuildGrantDraftOptions,
): Promise<AiGrantDraftResult> {
  const { prompt, locale } = parseAiDraftRequest({
    prompt: options.prompt,
    locale: options.locale,
  });

  const redacted = redactPrompt(prompt);
  const limiter = options.limiter ?? aiRateLimiter;
  const decision = limiter.consume(options.wallet, options.now ?? Date.now());
  if (!decision.allowed) throw new AiRateLimitError(decision.retryAfterSeconds);

  const presets = localizedCatalog(locale);
  const requestNotes: AiAdjustment[] = [];
  for (const finding of redacted.findings) {
    const code = REDACTION_CODES[finding.kind];
    if (!requestNotes.some((note) => note.code === code))
      requestNotes.push({ code });
  }
  for (const code of scanRequest(prompt))
    if (!requestNotes.some((note) => note.code === code))
      requestNotes.push({ code });

  const offline = (): AiGrantDraftResult => {
    const draft = heuristicDraft(redacted.text, presets);
    const adjustments = [...draft.adjustments];
    for (const note of requestNotes)
      if (!adjustments.some((entry) => entry.code === note.code))
        adjustments.push(note);
    return {
      preset: draft.preset,
      assumptions: draft.preset.assumptions,
      unsupported: draft.unsupported,
      adjustments,
      needsConfirmation: confirmationsFor(draft.preset),
      source: "fallback",
    };
  };

  if (!options.config) return offline();

  try {
    const raw = await requestAiGrantDraft({
      config: options.config,
      prompt: redacted.text,
      locale,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
    });
    const normalized = normalizeAiDraft(parseAiGrantDraft(raw));
    const adjustments = [...normalized.adjustments];
    for (const note of requestNotes)
      if (!adjustments.some((entry) => entry.code === note.code))
        adjustments.push(note);
    return {
      preset: normalized.preset,
      assumptions: normalized.preset.assumptions,
      unsupported: normalized.unsupported,
      adjustments,
      needsConfirmation: confirmationsFor(normalized.preset),
      source: "model",
    };
  } catch (error) {
    // A provider that is down, unauthorized, slow, or incoherent is a
    // degraded experience, not a failed request. Rethrowing anything else
    // would hide a real bug behind a plausible-looking fallback.
    if (
      error instanceof AiProviderError ||
      (error as Error)?.name === "InvalidAiDraftError" ||
      (error as Error)?.name === "InvalidPresetError"
    )
      return offline();
    throw error;
  }
}
