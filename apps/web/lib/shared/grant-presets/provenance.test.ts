import { describe, expect, it } from "vitest";

import { GENERATED_PRESET_KEY } from "./presets";
import { resolveTemplateLabel } from "./provenance";
import { formatOrganizationTemplateKey } from "./template-key";

const TEMPLATE_ID = "9d1e4b2a-7c3f-4a8e-9b21-5f6c0d3ac2a4";
const OTHER_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

const sources = {
  presetName: (preset: { name: string }) => `localized ${preset.name}`,
  generatedName: "Borrador de IA",
  organizationTemplates: [
    { id: OTHER_ID, name: "Other" },
    { id: TEMPLATE_ID, name: "Partner integration" },
  ],
};

describe("resolveTemplateLabel (HAS-13)", () => {
  it("names an organization template by its current name, whatever version was recorded", () => {
    for (const version of [1, 9]) {
      expect(
        resolveTemplateLabel(
          formatOrganizationTemplateKey(TEMPLATE_ID, version),
          sources,
        ),
      ).toBe("Partner integration");
    }
  });

  it("shows nothing for a template the viewer cannot read or that is gone", () => {
    const key = formatOrganizationTemplateKey(TEMPLATE_ID, 1);
    expect(
      resolveTemplateLabel(key, {
        ...sources,
        organizationTemplates: undefined,
      }),
    ).toBeUndefined();
    expect(
      resolveTemplateLabel(key, { ...sources, organizationTemplates: [] }),
    ).toBeUndefined();
  });

  it("keeps resolving catalog presets and AI drafts as before", () => {
    expect(resolveTemplateLabel("builder-grant", sources)).toBe(
      "localized Builder Grant",
    );
    expect(resolveTemplateLabel(GENERATED_PRESET_KEY, sources)).toBe(
      "Borrador de IA",
    );
  });

  it("shows nothing for an empty, unknown, or malformed key", () => {
    for (const key of [
      null,
      undefined,
      "",
      "not-a-preset",
      "Hand Edited",
      `org-template:${TEMPLATE_ID}`,
    ]) {
      expect(resolveTemplateLabel(key, sources)).toBeUndefined();
    }
  });

  it("matches an organization key only by template id", () => {
    expect(
      resolveTemplateLabel(formatOrganizationTemplateKey(OTHER_ID, 1), {
        ...sources,
        organizationTemplates: [{ id: TEMPLATE_ID, name: "Other" }],
      }),
    ).toBeUndefined();
  });
});
