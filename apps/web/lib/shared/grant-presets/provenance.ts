/**
 * Template provenance on grants (HAS-13).
 *
 * `organization_grants.template_key` records where a grant's wizard
 * suggestions came from. This resolves it to a name to show beside the grant,
 * and to nothing else: provenance is metadata, and the terms on screen always
 * come from the vault, never from the template.
 *
 * Layer-neutral: imports neither `@/lib/cloud` nor `@/lib/protocol`. The
 * caller supplies the organization's templates, archived ones included, and
 * the locale-resolved names. See docs/organization-templates.md.
 */

import { findGrantPreset, GENERATED_PRESET_KEY } from "./presets";
import type { GrantPreset } from "./presets";
import { parseTemplateKey } from "./template-key";

export function resolveTemplateLabel(
  key: string | null | undefined,
  sources: {
    /** A catalog preset's display name for the reader's locale. */
    presetName: (preset: GrantPreset) => string;
    /** The display name for a grant that started from an AI draft. */
    generatedName: string;
    /**
     * The grant's organization's templates, including archived ones. Undefined
     * while loading, or when the viewer cannot read them.
     */
    organizationTemplates?: readonly { id: string; name: string }[];
  },
): string | undefined {
  const reference = parseTemplateKey(key);
  if (!reference) return undefined;
  if (reference.kind === "organization")
    // The current name, whichever version the grant recorded: a rename is the
    // same template, and a template that cannot be read shows nothing.
    return sources.organizationTemplates?.find(
      (template) => template.id === reference.templateId,
    )?.name;
  if (reference.kind === "unknown") return undefined;
  if (reference.key === GENERATED_PRESET_KEY) return sources.generatedName;
  const preset = findGrantPreset(reference.key);
  return preset ? sources.presetName(preset) : undefined;
}
