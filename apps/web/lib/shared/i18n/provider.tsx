"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { createTranslator, getMessages } from "./dictionary";
import type { Messages, Translator } from "./dictionary";
import { DEFAULT_LOCALE, type Locale } from "./locales";

type I18nValue = {
  locale: Locale;
  t: Translator;
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Carries the request's locale into the client tree.
 *
 * It sits *above* the wallet providers and below nothing that unmounts, so a
 * language change — delivered as new props by `router.refresh()` — re-renders
 * the strings while wagmi, RainbowKit and the SIWE session keep their state.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslator(messages) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Locale and translator for a Client Component.
 * Falls back to English rather than throwing: a missing provider should never
 * be able to blank out a wallet control mid-demo.
 */
export function useI18n(): I18nValue {
  return useContext(I18nContext) ?? englishFallback();
}

/** `t()` for a Client Component. */
export function useTranslations(): Translator {
  return useI18n().t;
}

let fallback: I18nValue | null = null;

/** Built once, and only if some subtree renders outside the provider. */
function englishFallback(): I18nValue {
  fallback ??= {
    locale: DEFAULT_LOCALE,
    t: createTranslator(getMessages(DEFAULT_LOCALE)),
  };
  return fallback;
}
