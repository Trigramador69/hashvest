/**
 * Locale identity for the HashVest Cloud surface.
 *
 * This module is layer-neutral on purpose: locale selection is presentation
 * state, so it must not reach for `lib/cloud` or `lib/protocol`. English is the
 * default and the fallback; see `dictionary.ts` for how missing strings resolve.
 */

export const DEFAULT_LOCALE = "en" as const;

/**
 * Supported locales, in the order the selector renders them.
 * `htmlLang` is the BCP 47 tag written to `<html lang>`; `label` is the
 * endonym, which stays untranslated so a lost user can always find their way
 * back.
 */
export const LOCALES = [
  { code: "en", htmlLang: "en", label: "English" },
  { code: "zh-CN", htmlLang: "zh-Hans", label: "简体中文" },
  { code: "es", htmlLang: "es", label: "Español" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const LOCALE_CODES: readonly Locale[] = LOCALES.map(
  (locale) => locale.code,
);

/** Cookie carrying the reader's choice. Not a session cookie: no auth value. */
export const LOCALE_COOKIE_NAME = "hashvest_locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALE_CODES.includes(value as Locale);
}

export function localeMeta(locale: Locale) {
  return LOCALES.find((entry) => entry.code === locale) ?? LOCALES[0];
}

/** BCP 47 tag for `<html lang>` and for `Intl` formatters. */
export function htmlLang(locale: Locale) {
  return localeMeta(locale).htmlLang;
}

/**
 * Resolve a stored cookie value to a supported locale.
 * Anything unknown, stale, or absent falls back to English rather than
 * throwing, so a tampered cookie can never break a render.
 */
export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
