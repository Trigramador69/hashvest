import { redactPrompt } from "../ai-grant-draft/redact";
import {
  assertValidOrganizationTemplate,
  type OrganizationTemplateContent,
} from "../grant-presets/organization-template";

export class InvalidAiToolOutput extends Error {
  constructor() {
    super("Invalid AI tool output.");
  }
}

export function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InvalidAiToolOutput();
  return value as Record<string, unknown>;
}

export function prose(value: unknown, max = 600): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new InvalidAiToolOutput();
  // URLs remain server-owned references, never model-authored links or credentials.
  return redactPrompt(value.trim()).text.replace(
    /(?:https?:\/\/|ipfs:\/\/|www\.)\S+/gi,
    "[link]",
  );
}

export function proseList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 8)
    throw new InvalidAiToolOutput();
  return value.map((item) => prose(item));
}

export type AiTemplateDraft = {
  template: OrganizationTemplateContent;
  assumptions: string[];
  unsupported: string[];
  redacted: boolean;
};

export const textSchema = { type: "string" };
export const textListSchema = { type: "array", items: textSchema };
export function closedSchema(properties: Record<string, object>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export const AI_TEMPLATE_SCHEMA = {
  name: "organization_template_draft",
  strict: true,
  schema: closedSchema({
    name: textSchema,
    description: { type: ["string", "null"] },
    strategy: { type: "integer", enum: [0, 1, 2] },
    schedule: {
      anyOf: [
        { type: "null" },
        closedSchema({
          unitSeconds: { type: "integer", enum: [60, 3600, 86400] },
          cliffUnits: { type: "integer" },
          durationUnits: { type: "integer" },
        }),
      ],
    },
    milestones: {
      anyOf: [
        { type: "null" },
        {
          type: "array",
          items: closedSchema({
            title: textSchema,
            percentOfAllocation: { type: "integer" },
          }),
        },
      ],
    },
    allocationSuggestion: { type: ["string", "null"] },
    assumptions: textListSchema,
    unsupported: textListSchema,
  }),
};

export function parseTemplateDraft(raw: string): AiTemplateDraft {
  if (raw.length > 24000) throw new InvalidAiToolOutput();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidAiToolOutput();
  }
  const value = objectValue(parsed);
  if (![0, 1, 2].includes(value.strategy as number))
    throw new InvalidAiToolOutput();
  const schedule = value.schedule === null ? null : objectValue(value.schedule);
  if (
    schedule &&
    (!Number.isInteger(schedule.unitSeconds) ||
      !Number.isInteger(schedule.cliffUnits) ||
      !Number.isInteger(schedule.durationUnits))
  )
    throw new InvalidAiToolOutput();
  if (
    value.milestones !== null &&
    (!Array.isArray(value.milestones) || value.milestones.length > 20)
  )
    throw new InvalidAiToolOutput();
  if (
    value.allocationSuggestion !== null &&
    typeof value.allocationSuggestion !== "string"
  )
    throw new InvalidAiToolOutput();
  const template: OrganizationTemplateContent = {
    name: prose(value.name, 80),
    description:
      value.description === null ? null : prose(value.description, 1000),
    strategy: value.strategy as 0 | 1 | 2,
    schedule: schedule
      ? {
          unitSeconds: schedule.unitSeconds as 60 | 3600 | 86400,
          cliffUnits: schedule.cliffUnits as number,
          durationUnits: schedule.durationUnits as number,
        }
      : null,
    milestones:
      value.milestones === null
        ? null
        : (value.milestones as unknown[]).map((item) => {
            const milestone = objectValue(item);
            if (!Number.isInteger(milestone.percentOfAllocation))
              throw new InvalidAiToolOutput();
            return {
              title: prose(milestone.title, 120),
              percentOfAllocation: milestone.percentOfAllocation as number,
            };
          }),
    allocationSuggestion: value.allocationSuggestion as string | null,
    defaultReviewerMemberId: null,
  };
  assertValidOrganizationTemplate(template);
  return {
    template,
    assumptions: proseList(value.assumptions),
    unsupported: proseList(value.unsupported),
    redacted: redactPrompt(raw).findings.length > 0,
  };
}
