"use client";

import { useCallback, useMemo } from "react";

import { useI18n } from "../i18n/provider";
import { localizeGrantPreset } from "./localize";
import {
  findGrantPreset,
  GENERATED_PRESET_KEY,
  GRANT_PRESETS,
  getGrantPreset,
} from "./presets";
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
  templateLabel: (key: string | null | undefined) => string | undefined;
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
   * The display name for a stored `organization_grants.template_key`.
   *
   * A grant created from an AI draft (HAS-18) stores the reserved key, and no
   * catalog entry exists to resolve: the draft was built for that one request.
   * Only its name survives, which is all any caller shows — inventing a
   * strategy or a milestone split to fill a preset shape would put terms on
   * screen that the vault never agreed to.
   */
  const templateLabel = useCallback(
    (key: string | null | undefined) => {
      if (key === GENERATED_PRESET_KEY)
        return tOptional("ai.draft.name") ?? "AI draft";
      return findPreset(key)?.name;
    },
    [findPreset, tOptional],
  );

  return { presets, preset, findPreset, templateLabel };
}
