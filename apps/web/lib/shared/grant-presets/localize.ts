import type { OptionalTranslator } from "../i18n/dictionary";

import type { GrantPreset } from "./presets";

/**
 * Resolve a preset's display and prefill copy for the reader's locale.
 *
 * The catalog in `./presets.ts` stays the single source of truth for a
 * preset's *shape* — strategy, percentages, allocations, schedule units,
 * whether a reviewer is needed. None of that is translated. Only the strings
 * a person reads or drops into the wizard are, and the catalog's own English
 * value is the fallback, so a preset added without translations still works.
 *
 * Suggested titles and milestone titles are translated on purpose: they
 * prefill the form and would otherwise write English onchain for a reader who
 * never saw English. They remain editable, exactly as before.
 */
export function localizeGrantPreset(
  preset: GrantPreset,
  tOptional: OptionalTranslator,
): GrantPreset {
  const copy = (suffix: string, fallback: string) =>
    tOptional(`preset.${preset.key}.${suffix}`) ?? fallback;

  return {
    ...preset,
    name: copy("name", preset.name),
    tagline: copy("tagline", preset.tagline),
    description: copy("description", preset.description),
    bestFor: preset.bestFor.map((entry, index) =>
      copy(`bestFor.${index}`, entry),
    ),
    titleSuggestion: copy("titleSuggestion", preset.titleSuggestion),
    descriptionSuggestion:
      preset.descriptionSuggestion === undefined
        ? undefined
        : copy("descriptionSuggestion", preset.descriptionSuggestion),
    timing:
      preset.timing === null
        ? null
        : {
            ...preset.timing,
            realWorldNote: copy(
              "timing.realWorldNote",
              preset.timing.realWorldNote,
            ),
          },
    milestones:
      preset.milestones?.map((milestone, index) => ({
        ...milestone,
        title: copy(`milestone.${index}.title`, milestone.title),
      })) ?? null,
    assumptions: preset.assumptions.map((entry, index) =>
      copy(`assumption.${index}`, entry),
    ),
  };
}
