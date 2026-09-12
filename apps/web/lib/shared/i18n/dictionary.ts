import { en } from "./dictionaries/en";
import type { TranslationDictionary, TranslationKey } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { zhCN } from "./dictionaries/zh-CN";
import { DEFAULT_LOCALE, type Locale } from "./locales";

export type { TranslationKey, TranslationDictionary };

/**
 * Per-locale overrides on top of English. English itself has no override
 * entry: it *is* the base, so it can never be partially translated.
 */
const OVERRIDES: Record<
  Exclude<Locale, typeof DEFAULT_LOCALE>,
  TranslationDictionary
> = {
  "zh-CN": zhCN,
  es,
};

/** A fully resolved message map: every key present, no gaps. */
export type Messages = Record<TranslationKey, string>;

/** Values substituted into `{placeholder}` slots. */
export type TranslationValues = Record<string, string | number>;

export type Translator = (
  key: TranslationKey,
  values?: TranslationValues,
) => string;

/**
 * Drop entries a translator left blank so they fall back to English instead of
 * rendering an empty element. An untranslated string is recoverable; a missing
 * one looks like a broken page.
 */
function withoutBlanks(
  dictionary: TranslationDictionary,
): TranslationDictionary {
  const filled: TranslationDictionary = {};
  for (const [key, value] of Object.entries(dictionary)) {
    if (typeof value === "string" && value.trim() !== "") {
      filled[key as TranslationKey] = value;
    }
  }
  return filled;
}

/**
 * Resolve the complete message map for a locale.
 * English is spread first, so any key the locale omits — or leaves blank —
 * falls back to English predictably rather than surfacing a raw key.
 */
export function getMessages(locale: Locale): Messages {
  if (locale === DEFAULT_LOCALE) return { ...en };
  return { ...en, ...withoutBlanks(OVERRIDES[locale]) };
}

/**
 * Substitute `{name}` placeholders. An unknown placeholder is left verbatim:
 * a visible `{amount}` in the UI is a bug report, a silent empty string is not.
 */
export function interpolate(
  template: string,
  values?: TranslationValues,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : match,
  );
}

/**
 * Build the `t()` used by pages and components. The second English lookup is
 * a guard for message maps that crossed the server/client boundary and lost a
 * key in transit.
 */
export function createTranslator(messages: Messages): Translator {
  return (key, values) => interpolate(messages[key] ?? en[key], values);
}

/** Locales that are missing at least one key, as a build-time diagnostic. */
export function missingKeys(locale: Locale): TranslationKey[] {
  if (locale === DEFAULT_LOCALE) return [];
  const translated = withoutBlanks(OVERRIDES[locale]);
  return (Object.keys(en) as TranslationKey[]).filter(
    (key) => translated[key] === undefined,
  );
}
