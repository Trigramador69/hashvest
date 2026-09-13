"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

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
    <label
      className={cn(
        "relative inline-flex items-center",
        size === "default" && "w-full max-w-xs",
      )}
    >
      <span className="sr-only">{t("locale.label")}</span>
      <select
        className={cn(
          "appearance-none rounded-control border border-border bg-surface-2 font-mono text-xs tracking-[-0.01em] text-foreground",
          "pr-8 transition-colors hover:border-border-strong hover:bg-surface-hover",
          "focus:border-border-strong focus:outline-none focus-visible:border-border-strong",
          "disabled:cursor-not-allowed disabled:opacity-60",
          size === "compact"
            ? "h-9 min-w-[8.5rem] pl-3"
            : "h-11 w-full min-h-11 pl-3.5",
        )}
        value={locale}
        aria-label={t("locale.choose")}
        disabled={pending}
        onChange={(event) => select(event.target.value)}
      >
        {LOCALES.map((entry) => (
          <option
            key={entry.code}
            value={entry.code}
            lang={entry.htmlLang}
            className="bg-surface-2 text-foreground"
          >
            {entry.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground"
        strokeWidth={1.25}
      />
    </label>
  );
}
