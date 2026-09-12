"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  LOCALES,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  htmlLang,
  isLocale,
} from "@/lib/shared/i18n/locales";
import { useI18n } from "@/lib/shared/i18n/provider";

/**
 * Language selector for the header.
 *
 * Writes the choice to a cookie and asks Next to re-render. `router.refresh()`
 * keeps the React tree mounted, so the wallet connection, the RainbowKit modal
 * state and the SIWE session all survive a language change.
 *
 * Option labels are endonyms and are never translated: a reader who landed on
 * the wrong language must still be able to recognize their own.
 */
export function LocaleSwitcher() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  function select(value: string) {
    if (!isLocale(value) || value === locale) return;
    document.cookie = [
      `${LOCALE_COOKIE_NAME}=${value}`,
      "path=/",
      `max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}`,
      "samesite=lax",
    ].join("; ");
    // Correct the document language immediately; the refresh confirms it.
    document.documentElement.lang = htmlLang(value);
    startTransition(() => router.refresh());
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="sr-only">{t("locale.label")}</span>
      <select
        className="field h-9 w-auto min-w-24 py-1 text-xs"
        value={locale}
        aria-label={t("locale.choose")}
        disabled={pending}
        onChange={(event) => select(event.target.value)}
      >
        {LOCALES.map((entry) => (
          <option key={entry.code} value={entry.code} lang={entry.htmlLang}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );
}
