import "server-only";

import { cookies } from "next/headers";

import { createTranslator, getMessages } from "./dictionary";
import type { Messages, Translator } from "./dictionary";
import { LOCALE_COOKIE_NAME, resolveLocale, type Locale } from "./locales";

/**
 * The reader's locale for this request.
 *
 * Reading the cookie opts the route into dynamic rendering. That is already
 * true of every wallet-driven surface here, and the landing page is cheap to
 * render, so the tradeoff buys locale selection without a `[lang]` segment and
 * without rewriting a single route.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

/** Locale, resolved messages, and `t()` for a Server Component. */
export async function getTranslations(): Promise<{
  locale: Locale;
  messages: Messages;
  t: Translator;
}> {
  const locale = await getLocale();
  const messages = getMessages(locale);
  return { locale, messages, t: createTranslator(messages) };
}
