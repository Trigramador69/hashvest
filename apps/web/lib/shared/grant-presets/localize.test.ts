import { describe, expect, it } from "vitest";

import { createOptionalTranslator, getMessages } from "../i18n/dictionary";
import { LOCALE_CODES } from "../i18n/locales";

import { localizeGrantPreset } from "./localize";
import { GRANT_PRESETS } from "./presets";
import type { GrantPreset } from "./presets";

/** Every dictionary key a preset resolves, paired with the catalog's English. */
function copyKeys(preset: GrantPreset): [string, string][] {
  const prefix = `preset.${preset.key}`;
  const entries: [string, string][] = [
    [`${prefix}.name`, preset.name],
    [`${prefix}.tagline`, preset.tagline],
    [`${prefix}.description`, preset.description],
    [`${prefix}.titleSuggestion`, preset.titleSuggestion],
  ];
  if (preset.descriptionSuggestion !== undefined) {
    entries.push([
      `${prefix}.descriptionSuggestion`,
      preset.descriptionSuggestion,
    ]);
  }
  preset.bestFor.forEach((value, index) =>
    entries.push([`${prefix}.bestFor.${index}`, value]),
  );
  if (preset.timing) {
    entries.push([
      `${prefix}.timing.realWorldNote`,
      preset.timing.realWorldNote,
    ]);
  }
  preset.milestones?.forEach((milestone, index) =>
    entries.push([`${prefix}.milestone.${index}.title`, milestone.title]),
  );
  preset.assumptions.forEach((value, index) =>
    entries.push([`${prefix}.assumption.${index}`, value]),
  );
  return entries;
}

const english = getMessages("en") as Record<string, string | undefined>;

describe("preset copy is covered by the dictionary", () => {
  it("has an English key for every string a preset renders", () => {
    // Guards the index-based keys: adding a milestone or an assumption to the
    // catalog without translating it fails here rather than in the demo.
    for (const preset of GRANT_PRESETS) {
      for (const [key] of copyKeys(preset)) {
        expect(english[key], `missing dictionary key: ${key}`).toBeDefined();
      }
    }
  });

  it("keeps the English dictionary identical to the catalog", () => {
    // Two sources of the same English string can drift; this pins them.
    for (const preset of GRANT_PRESETS) {
      for (const [key, value] of copyKeys(preset)) {
        expect(english[key], key).toBe(value);
      }
    }
  });

  it("translates every preset string in every non-English locale", () => {
    for (const locale of LOCALE_CODES.filter((code) => code !== "en")) {
      const messages = getMessages(locale) as Record<string, string>;
      for (const preset of GRANT_PRESETS) {
        for (const [key, value] of copyKeys(preset)) {
          expect(messages[key], `${locale} → ${key}`).toBeDefined();
          expect(messages[key], `${locale} → ${key} is still English`).not.toBe(
            value,
          );
        }
      }
    }
  });
});

describe("localizeGrantPreset", () => {
  const translators = LOCALE_CODES.map(
    (locale) =>
      [locale, createOptionalTranslator(getMessages(locale))] as const,
  );

  it("never changes the parts of a preset that are data, not copy", () => {
    for (const [locale, tOptional] of translators) {
      for (const preset of GRANT_PRESETS) {
        const localized = localizeGrantPreset(preset, tOptional);
        expect(localized.key, locale).toBe(preset.key);
        expect(localized.strategy, locale).toBe(preset.strategy);
        expect(localized.allocationSuggestion, locale).toBe(
          preset.allocationSuggestion,
        );
        expect(localized.reviewerRequired, locale).toBe(
          preset.reviewerRequired,
        );
        expect(localized.timing?.unit, locale).toBe(preset.timing?.unit);
        expect(localized.timing?.cliff, locale).toBe(preset.timing?.cliff);
        expect(localized.timing?.duration, locale).toBe(
          preset.timing?.duration,
        );
        expect(
          localized.milestones?.map((m) => m.percentOfAllocation),
          locale,
        ).toEqual(preset.milestones?.map((m) => m.percentOfAllocation));
        expect(localized.bestFor.length, locale).toBe(preset.bestFor.length);
        expect(localized.assumptions.length, locale).toBe(
          preset.assumptions.length,
        );
      }
    }
  });

  it("returns the catalog's English unchanged for the default locale", () => {
    const tOptional = createOptionalTranslator(getMessages("en"));
    for (const preset of GRANT_PRESETS) {
      expect(localizeGrantPreset(preset, tOptional)).toEqual(preset);
    }
  });

  it("translates the strings a reader sees", () => {
    const tOptional = createOptionalTranslator(getMessages("zh-CN"));
    for (const preset of GRANT_PRESETS) {
      const localized = localizeGrantPreset(preset, tOptional);
      expect(localized.name).not.toBe(preset.name);
      expect(localized.tagline).not.toBe(preset.tagline);
      expect(localized.titleSuggestion).not.toBe(preset.titleSuggestion);
      localized.milestones?.forEach((milestone, index) =>
        expect(milestone.title).not.toBe(preset.milestones?.[index]?.title),
      );
    }
  });

  it("falls back to the catalog when a key is absent", () => {
    // A preset added without translations must still render.
    const localized = localizeGrantPreset(GRANT_PRESETS[0], () => undefined);
    expect(localized).toEqual(GRANT_PRESETS[0]);
  });
});
