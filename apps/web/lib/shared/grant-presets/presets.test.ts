import { describe, expect, it } from "vitest";

import { assertValidCatalog } from "./apply-preset";
import {
  GENERATED_PRESET_KEY,
  GRANT_PRESETS,
  findGrantPreset,
  getGrantPreset,
  type GrantPresetKey,
} from "./presets";

const expectedKeys: GrantPresetKey[] = [
  "builder-grant",
  "employee-vesting",
  "advisor-vesting",
  "ecosystem-grant",
];

describe("grant preset catalog", () => {
  it("ships exactly the four global presets with unique keys", () => {
    expect(GRANT_PRESETS.map((preset) => preset.key)).toEqual(expectedKeys);
    expect(new Set(GRANT_PRESETS.map((preset) => preset.key)).size).toBe(
      GRANT_PRESETS.length,
    );
  });

  it("covers every unlock strategy the wizard supports", () => {
    expect(new Set(GRANT_PRESETS.map((preset) => preset.strategy))).toEqual(
      new Set([0, 1, 2]),
    );
  });

  // A bad catalog edit must fail CI, not the demo.
  it("keeps the whole catalog valid", () => {
    expect(() => assertValidCatalog(GRANT_PRESETS)).not.toThrow();
  });

  it("gives every preset the copy the picker and a future AI draft need", () => {
    for (const preset of GRANT_PRESETS) {
      expect(preset.name.trim()).not.toBe("");
      expect(preset.tagline.trim()).not.toBe("");
      expect(preset.description.trim()).not.toBe("");
      expect(preset.bestFor.length).toBeGreaterThan(0);
      expect(preset.assumptions.length).toBeGreaterThan(0);
      expect(preset.titleSuggestion.trim()).not.toBe("");
      expect(preset.allocationSuggestion).toMatch(/^\d+(\.\d+)?$/);
    }
  });

  it("never gives a time-vesting preset reviewer semantics", () => {
    for (const preset of GRANT_PRESETS.filter((item) => item.strategy === 0)) {
      expect(preset.reviewerRequired).toBe(false);
      expect(preset.milestones).toBeNull();
    }
  });

  it("resolves presets by key and rejects unknown keys", () => {
    expect(getGrantPreset("builder-grant").name).toBe("Builder Grant");
    expect(() => getGrantPreset("nope" as GrantPresetKey)).toThrow(
      "Unknown grant preset",
    );
  });

  it("leaves the generated draft key unclaimed by the catalog", () => {
    // An AI draft (HAS-16/HAS-18) is built per request and has no catalog
    // entry to look up, so a preset claiming this key would shadow it.
    expect(GRANT_PRESETS.map((preset) => preset.key)).not.toContain(
      GENERATED_PRESET_KEY,
    );
    expect(findGrantPreset(GENERATED_PRESET_KEY)).toBeUndefined();
  });

  it("reads a stored template key back without throwing on an unknown one", () => {
    expect(findGrantPreset("builder-grant")?.name).toBe("Builder Grant");
    // organization_grants.template_key holds arbitrary text, and a key may be
    // retired or belong to an organization template (HAS-13).
    for (const key of ["retired-preset", "", null, undefined])
      expect(findGrantPreset(key)).toBeUndefined();
  });
});
