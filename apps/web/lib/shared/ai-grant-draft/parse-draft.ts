/**
 * Re-derives a draft from an untrusted payload (HAS-16).
 *
 * The provider was handed a JSON Schema, but a schema sent to a model is a
 * request, not a guarantee: providers honour `response_format` to different
 * degrees, and a hostile or simply confused response can return anything at
 * all. So nothing here reads the payload as if it were already the right
 * shape. Every field is re-derived, every unknown key is dropped by name, and
 * prose is redacted on the way in so a title cannot smuggle an address into
 * the wizard.
 *
 * Dropping is reported rather than silent: a payload that tried to name a
 * beneficiary is exactly what the user should be told about.
 */

import { redactText, type RedactionKind } from "./redact";
import {
  AI_DESCRIPTION_MAX_LENGTH,
  AI_MAX_ASSUMPTIONS,
  AI_MAX_MILESTONES,
  AI_MAX_UNSUPPORTED,
  AI_MILESTONE_TITLE_MAX_LENGTH,
  AI_NOTE_MAX_LENGTH,
  AI_SCHEDULE_UNITS,
  AI_TITLE_MAX_LENGTH,
  type AiGrantDraft,
  type AiGrantDraftMilestone,
  type AiGrantDraftTiming,
  type AiScheduleUnit,
} from "./schema";

export class InvalidAiDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAiDraftError";
  }
}

export type ParsedAiDraft = {
  draft: AiGrantDraft;
  /** Keys the payload carried that a grant template has no place for. */
  droppedFields: string[];
  /** Kinds of sensitive value removed from the payload's prose. */
  redactions: RedactionKind[];
};

const DRAFT_FIELDS = [
  "strategy",
  "title",
  "description",
  "allocation",
  "timing",
  "milestones",
  "assumptions",
  "unsupported",
] as const;

const TIMING_FIELDS = ["unit", "cliff", "duration", "realWorldNote"] as const;
const MILESTONE_FIELDS = ["title", "percentOfAllocation"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Records every key outside `allowed`, prefixed so nested drops stay readable. */
function collectDropped(
  value: Record<string, unknown>,
  allowed: readonly string[],
  prefix: string,
  into: string[],
): void {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) into.push(`${prefix}${key}`);
}

/** Models answer with numbers where the schema said string, and vice versa. */
function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asWholeNumber(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isInteger(value) ? value : undefined;
  if (typeof value === "string" && /^\d+$/.test(value.trim()))
    return Number(value.trim());
  return undefined;
}

/** Trims, clamps, and strips anything sensitive, reporting what it removed. */
function cleanProse(
  value: unknown,
  maxLength: number,
  redactions: RedactionKind[],
): string {
  const text = asText(value);
  if (text === undefined) return "";
  const redacted = redactText(text);
  for (const finding of redacted.findings)
    if (!redactions.includes(finding.kind)) redactions.push(finding.kind);
  return redacted.text.trim().slice(0, maxLength);
}

function cleanProseList(
  value: unknown,
  maxItems: number,
  redactions: RedactionKind[],
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => cleanProse(entry, AI_NOTE_MAX_LENGTH, redactions))
    .filter((entry) => entry.length > 0)
    .slice(0, maxItems);
}

function parseStrategy(value: unknown): 0 | 1 | 2 {
  const strategy = asWholeNumber(value);
  if (strategy !== 0 && strategy !== 1 && strategy !== 2)
    throw new InvalidAiDraftError(
      "The draft did not name a supported unlock strategy.",
    );
  return strategy;
}

function parseAllocation(value: unknown): string {
  const allocation = asText(value)?.trim().replace(/,/g, "");
  if (!allocation || !/^\d+(\.\d+)?$/.test(allocation))
    throw new InvalidAiDraftError("The draft did not name a token amount.");
  return allocation;
}

function parseTiming(
  value: unknown,
  droppedFields: string[],
  redactions: RedactionKind[],
): AiGrantDraftTiming | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value))
    throw new InvalidAiDraftError(
      "The draft's vesting schedule is not usable.",
    );
  collectDropped(value, TIMING_FIELDS, "timing.", droppedFields);

  const unit = asText(value.unit)?.trim();
  if (!unit || !AI_SCHEDULE_UNITS.includes(unit as AiScheduleUnit))
    throw new InvalidAiDraftError(
      "The draft used a schedule unit the wizard cannot select.",
    );

  const duration = asWholeNumber(value.duration);
  if (duration === undefined)
    throw new InvalidAiDraftError(
      "The draft's vesting duration is not a whole number.",
    );

  return {
    unit: unit as AiScheduleUnit,
    cliff: String(asWholeNumber(value.cliff) ?? 0),
    duration: String(duration),
    realWorldNote: cleanProse(
      value.realWorldNote,
      AI_NOTE_MAX_LENGTH,
      redactions,
    ),
  };
}

function parseMilestones(
  value: unknown,
  droppedFields: string[],
  redactions: RedactionKind[],
): AiGrantDraftMilestone[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value))
    throw new InvalidAiDraftError("The draft's milestone list is not usable.");
  if (!value.length) return null;

  // Truncation belongs to normalization, which rescales the percentages with
  // it; dropping rows here would leave a split that no longer sums to 100.
  return value.slice(0, AI_MAX_MILESTONES * 2).map((entry, index) => {
    if (!isRecord(entry))
      throw new InvalidAiDraftError(`Milestone ${index + 1} is not usable.`);
    collectDropped(
      entry,
      MILESTONE_FIELDS,
      `milestones[${index}].`,
      droppedFields,
    );
    const percent = asWholeNumber(entry.percentOfAllocation);
    if (percent === undefined || percent <= 0)
      throw new InvalidAiDraftError(
        `Milestone ${index + 1} has no usable percentage.`,
      );
    return {
      title: cleanProse(entry.title, AI_MILESTONE_TITLE_MAX_LENGTH, redactions),
      percentOfAllocation: percent,
    };
  });
}

/**
 * Parses a provider payload into a draft.
 *
 * Accepts either a decoded object or the raw JSON text a provider put in a
 * message body. Throws `InvalidAiDraftError` when the payload cannot be
 * rescued; the caller turns that into a usable fallback rather than an error
 * page.
 */
export function parseAiGrantDraft(raw: unknown): ParsedAiDraft {
  let payload = raw;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      throw new InvalidAiDraftError("The draft was not valid JSON.");
    }
  }
  if (!isRecord(payload))
    throw new InvalidAiDraftError("The draft was not a JSON object.");

  const droppedFields: string[] = [];
  const redactions: RedactionKind[] = [];
  collectDropped(payload, DRAFT_FIELDS, "", droppedFields);

  const title = cleanProse(payload.title, AI_TITLE_MAX_LENGTH, redactions);
  if (!title) throw new InvalidAiDraftError("The draft has no title.");

  const draft: AiGrantDraft = {
    strategy: parseStrategy(payload.strategy),
    title,
    description: cleanProse(
      payload.description,
      AI_DESCRIPTION_MAX_LENGTH,
      redactions,
    ),
    allocation: parseAllocation(payload.allocation),
    timing: parseTiming(payload.timing, droppedFields, redactions),
    milestones: parseMilestones(payload.milestones, droppedFields, redactions),
    assumptions: cleanProseList(
      payload.assumptions,
      AI_MAX_ASSUMPTIONS,
      redactions,
    ),
    unsupported: cleanProseList(
      payload.unsupported,
      AI_MAX_UNSUPPORTED,
      redactions,
    ),
  };

  return { draft, droppedFields, redactions };
}
