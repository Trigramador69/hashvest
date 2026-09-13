/**
 * `organization_grants.template_key` linkage (HAS-12).
 *
 * One column records where a grant's wizard suggestions came from, for two
 * kinds of source that must never be confused:
 *
 * | Kind                  | Format                           |
 * | --------------------- | -------------------------------- |
 * | Global preset         | lowercase kebab-case             |
 * | Organization template | `org-template:<uuid>@v<version>` |
 *
 * Global keys cannot contain a colon and every organization key does, so the
 * namespaces are disjoint. The version travels in the key so a grant can say
 * which revision it was created from without a versions table.
 *
 * Layer-neutral: imports neither `@/lib/cloud` nor `@/lib/protocol`.
 * See docs/organization-templates.md.
 */

/** Mirrors TEMPLATE_KEY_MAX_LENGTH in lib/cloud/organizations/validation.ts. */
export const TEMPLATE_KEY_MAX_LENGTH = 80;

export const ORGANIZATION_TEMPLATE_KEY_PREFIX = "org-template:";

/** The only shape a global preset key may take. Enforced by assertValidCatalog. */
export const GLOBAL_PRESET_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** PostgreSQL `integer`, which stores the template version. */
const MAX_VERSION = 2_147_483_647;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const ORGANIZATION_KEY_PATTERN =
  /^org-template:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})@v([1-9][0-9]{0,9})$/;

export type TemplateKeyReference =
  | { kind: "global"; key: string }
  | { kind: "organization"; templateId: string; version: number }
  | { kind: "unknown"; key: string };

export class InvalidTemplateKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTemplateKeyError";
  }
}

/** Builds the key a grant records when it was created from an organization template. */
export function formatOrganizationTemplateKey(
  templateId: string,
  version: number,
): string {
  const id = templateId.trim().toLowerCase();
  if (!UUID_PATTERN.test(id))
    throw new InvalidTemplateKeyError("Template ID must be a UUID.");
  if (!Number.isInteger(version) || version < 1 || version > MAX_VERSION)
    throw new InvalidTemplateKeyError(
      "Template version must be a positive whole number.",
    );
  return `${ORGANIZATION_TEMPLATE_KEY_PREFIX}${id}@v${version}`;
}

/**
 * Classifies a stored key. Never throws: the column accepts any trimmed text,
 * so legacy or hand-edited values come back as `unknown` and a grant card can
 * degrade to showing no template rather than failing.
 */
export function parseTemplateKey(
  key: string | null | undefined,
): TemplateKeyReference | null {
  if (typeof key !== "string") return null;
  const value = key.trim();
  if (!value) return null;

  const organization = ORGANIZATION_KEY_PATTERN.exec(value);
  if (organization) {
    const version = Number(organization[2]);
    if (version <= MAX_VERSION)
      return {
        kind: "organization",
        templateId: organization[1],
        version,
      };
  }

  if (
    GLOBAL_PRESET_KEY_PATTERN.test(value) &&
    value.length <= TEMPLATE_KEY_MAX_LENGTH
  )
    return { kind: "global", key: value };

  return { kind: "unknown", key: value };
}
