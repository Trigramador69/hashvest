"use client";

import { useCallback, useMemo } from "react";

import { useI18n } from "../i18n/provider";
import { localizeGrantPreset } from "./localize";
import { findGrantPreset, GRANT_PRESETS, getGrantPreset } from "./presets";
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
  return { presets, preset, findPreset };
}
