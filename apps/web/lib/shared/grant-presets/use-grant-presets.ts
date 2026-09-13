"use client";

import { useCallback, useMemo } from "react";

import { useI18n } from "../i18n/provider";
import { localizeGrantPreset } from "./localize";
import { findGrantPreset, GRANT_PRESETS, getGrantPreset } from "./presets";
import { resolveTemplateLabel } from "./provenance";
import type { GrantPreset, GrantPresetKey } from "./presets";

/**
 * The preset catalog, resolved for the reader's locale.
 *
 * Components should read presets through this hook rather than importing
 * `GRANT_PRESETS` directly, so a language change re-renders preset copy along
 * with everything else.
 */
export function useGrantPresets(): {
  presets: GrantPreset[];
  preset: (key: GrantPresetKey) => GrantPreset;
  findPreset: (key: string | null | undefined) => GrantPreset | undefined;
  templateLabel: (
    key: string | null | undefined,
    organizationTemplates?: readonly { id: string; name: string }[],
  ) => string | undefined;
} {
  const { tOptional } = useI18n();
  const presets = useMemo(
    () => GRANT_PRESETS.map((entry) => localizeGrantPreset(entry, tOptional)),
    [tOptional],
  );
  const preset = useCallback(
    (key: GrantPresetKey) =>
      localizeGrantPreset(getGrantPreset(key), tOptional),
    [tOptional],
  );
  const findPreset = useCallback(
    (key: string | null | undefined) => {
      const found = findGrantPreset(key);
      return found ? localizeGrantPreset(found, tOptional) : undefined;
    },
    [tOptional],
  );
  /**
   * The display name for a stored `organization_grants.template_key`, resolved
   * by `resolveTemplateLabel` (./provenance.ts).
   *
   * A grant created from an AI draft (HAS-18) stores the reserved key, and no
   * catalog entry exists to resolve: the draft was built for that one request.
   * Only its name survives, which is all any caller shows — inventing a
   * strategy or a milestone split to fill a preset shape would put terms on
   * screen that the vault never agreed to. An organization template (HAS-13)
   * resolves only against the templates the caller passes in.
   */
  const templateLabel = useCallback(
    (
      key: string | null | undefined,
      organizationTemplates?: readonly { id: string; name: string }[],
    ) =>
      resolveTemplateLabel(key, {
        presetName: (found) => localizeGrantPreset(found, tOptional).name,
        generatedName: tOptional("ai.draft.name") ?? "AI draft",
        organizationTemplates,
      }),
    [tOptional],
  );

  return { presets, preset, findPreset, templateLabel };
}
