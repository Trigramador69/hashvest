import { describe, expect, it } from "vitest";

import { assertValidCatalog, InvalidPresetError } from "./apply-preset";
import { GRANT_PRESETS, type GrantPreset } from "./presets";
import {
  formatOrganizationTemplateKey,
  InvalidTemplateKeyError,
  parseTemplateKey,
  TEMPLATE_KEY_MAX_LENGTH,
} from "./template-key";

const TEMPLATE_ID = "9d1e4b2a-7c3f-4a8e-9b21-5f6c0d3ac2a4";

describe("organization template keys", () => {
  it("round-trips an id and version", () => {
    const key = formatOrganizationTemplateKey(TEMPLATE_ID, 3);
    expect(key).toBe(`org-template:${TEMPLATE_ID}@v3`);
    expect(parseTemplateKey(key)).toEqual({
      kind: "organization",
      templateId: TEMPLATE_ID,
      version: 3,
    });
  });

  it("normalizes the id to lowercase", () => {
    expect(formatOrganizationTemplateKey(TEMPLATE_ID.toUpperCase(), 1)).toBe(
      `org-template:${TEMPLATE_ID}@v1`,
    );
  });

  it("always fits the existing template_key column", () => {
    const longest = formatOrganizationTemplateKey(TEMPLATE_ID, 2_147_483_647);
    expect(longest.length).toBeLessThanOrEqual(TEMPLATE_KEY_MAX_LENGTH);
  });

  it("refuses ids and versions it could never parse back", () => {
    for (const id of ["", "not-a-uuid", `${TEMPLATE_ID}x`]) {
      expect(() => formatOrganizationTemplateKey(id, 1)).toThrow(
        InvalidTemplateKeyError,
      );
    }
    for (const version of [0, -1, 1.5, Number.NaN, 2_147_483_648]) {
      expect(() => formatOrganizationTemplateKey(TEMPLATE_ID, version)).toThrow(
        InvalidTemplateKeyError,
      );
    }
  });
});

describe("parseTemplateKey", () => {
  it("classifies every shipped global preset key as global", () => {
    for (const preset of GRANT_PRESETS) {
      expect(parseTemplateKey(preset.key)).toEqual({
        kind: "global",
        key: preset.key,
      });
    }
  });

  it("never lets a global key be read as an organization template", () => {
    for (const preset of GRANT_PRESETS) {
      expect(parseTemplateKey(preset.key)?.kind).not.toBe("organization");
    }
  });

  it("returns null for absent keys", () => {
    for (const key of [null, undefined, "", "   "]) {
      expect(parseTemplateKey(key)).toBeNull();
    }
  });

  it("classifies malformed values as unknown instead of throwing", () => {
    for (const key of [
      "Builder Grant",
      "org-template:",
      `org-template:${TEMPLATE_ID}`,
      `org-template:${TEMPLATE_ID}@v0`,
      `org-template:${TEMPLATE_ID}@v01`,
      `org-template:${TEMPLATE_ID.toUpperCase()}@v1`,
      `org-template:not-a-uuid@v1`,
      `org-template:${TEMPLATE_ID}@v99999999999`,
    ]) {
      expect(parseTemplateKey(key)?.kind).toBe("unknown");
    }
  });

  it("trims surrounding whitespace before classifying", () => {
    expect(parseTemplateKey("  builder-grant  ")).toEqual({
      kind: "global",
      key: "builder-grant",
    });
  });
});

describe("global preset catalog keys", () => {
  it("rejects a catalog key that could collide with an organization key", () => {
    const [first] = GRANT_PRESETS;
    for (const key of [
      `org-template:${TEMPLATE_ID}@v1`,
      "Builder-Grant",
      "builder_grant",
      "builder--grant",
    ]) {
      const catalog: GrantPreset[] = [{ ...first, key }];
      expect(() => assertValidCatalog(catalog)).toThrow(InvalidPresetError);
    }
  });
});
