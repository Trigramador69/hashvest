"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LOCALES,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  htmlLang,
  isLocale,
} from "@/lib/shared/i18n/locales";
import { useI18n } from "@/lib/shared/i18n/provider";
import { cn } from "@/lib/shared/utils";

/**
 * Language selector for the header and workspace settings.
 *
 * Writes the choice to a cookie and asks Next to re-render. `router.refresh()`
 * keeps the React tree mounted, so the wallet connection, the RainbowKit modal
 * state and the SIWE session all survive a language change.
 *
 * Option labels are endonyms and are never translated: a reader who landed on
 * the wrong language must still be able to recognize their own.
 */
export function LocaleSwitcher({
  size = "compact",
}: {
  size?: "compact" | "default";
}) {
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
    <div
      className={cn(
        "relative inline-flex items-center",
        size === "default" && "w-full max-w-xs",
      )}
    >
      <span aria-hidden="true" className="sr-only">
        {t("locale.label")}
      </span>
      <Select value={locale} onValueChange={select} disabled={pending}>
        <SelectTrigger
          aria-label={t("locale.choose")}
          className={cn(
            size === "compact" ? "h-11 min-w-[8.5rem]" : "h-11 min-h-11 w-full",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {LOCALES.map((entry) => (
            <SelectItem
              key={entry.code}
              value={entry.code}
              lang={entry.htmlLang}
            >
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
