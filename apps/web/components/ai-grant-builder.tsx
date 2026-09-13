"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { PixelField, type PixelFieldState } from "@/components/ui/pixel-field";
import { AiApiError, aiApi } from "@/lib/cloud/ai/client";
import type { AiGrantDraftResult } from "@/lib/cloud/ai/draft-service";
import type { AiAdjustment } from "@/lib/shared/ai-grant-draft/normalize";
import {
  AI_PROMPT_MAX_LENGTH,
  AI_PROMPT_MIN_LENGTH,
} from "@/lib/shared/ai-grant-draft/schema";
import type { GrantPreset } from "@/lib/shared/grant-presets/presets";
import type { TranslationKey } from "@/lib/shared/i18n/dictionaries/en";
import { strategyKey } from "@/lib/shared/i18n/keys";
import type { Locale } from "@/lib/shared/i18n/locales";
import { useI18n } from "@/lib/shared/i18n/provider";
import { cn } from "@/lib/shared/utils";

/**
 * The optional AI draft entry point for the grant wizard (HAS-18).
 *
 * Deliberately not a chat. There is no transcript, no streaming text and no
 * assistant persona: one description goes in, one editable draft comes back,
 * and it is applied through exactly the same path as a hand-written preset.
 * The progress lines name the real pipeline stages rather than filling time,
 * and the disclaimer is permanent rather than conditional — the guarantee that
 * a draft cannot sign, fund, approve, claim or revoke does not depend on what
 * the user happened to type.
 *
 * The launcher is a floating control so the wizard's own five steps keep their
 * layout and reading order whether or not a provider is configured.
 */

const UNIT_KEYS: Record<string, TranslationKey> = {
  "60": "wizard.unit.minutes",
  "3600": "wizard.unit.hours",
  "86400": "wizard.unit.days",
};

const PROGRESS_KEYS: TranslationKey[] = [
  "ai.progress.0",
  "ai.progress.1",
  "ai.progress.2",
  "ai.progress.3",
  "ai.progress.4",
];

const FOCUSABLE =
  'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function Section({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item, index) => (
          <li
            key={index}
            className={cn(
              "flex gap-2 text-xs leading-5",
              tone === "warning" ? "text-[#e9832d]" : "text-muted-foreground",
            )}
          >
            <span aria-hidden="true" className="select-none opacity-60">
              ·
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiGrantBuilder({
  onApply,
  disabled = false,
  className,
}: {
  /** Receives a validated preset, applied through the wizard's preset path. */
  onApply: (preset: GrantPreset) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<AiGrantDraftResult | null>(null);
  // The locale the draft's prose was written in. Chrome re-renders from the
  // dictionary when the reader switches language; a model's sentences cannot,
  // so a draft outlives the language it was written for.
  const [draftLocale, setDraftLocale] = useState<Locale | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const describeError = useCallback(
    (cause: unknown): string => {
      if (cause instanceof AiApiError) {
        if (cause.status === 401) return t("ai.error.unauthenticated");
        if (cause.status === 429)
          return t("ai.error.rateLimited", {
            seconds: cause.retryAfterSeconds ?? 60,
          });
        if (cause.status === 400)
          return t("ai.error.invalidPrompt", {
            min: AI_PROMPT_MIN_LENGTH,
            max: AI_PROMPT_MAX_LENGTH,
          });
      }
      return t("ai.error.failed");
    },
    [t],
  );

  const mutation = useMutation({
    mutationFn: () => aiApi.draftGrant({ prompt: prompt.trim(), locale }),
    onMutate: () => setProgress(0),
    onSuccess: (result) => {
      setDraft(result);
      setDraftLocale(locale);
      setError("");
    },
    onError: (cause) => {
      setDraft(null);
      setError(describeError(cause));
    },
  });

  // The progress lines advance on their own clock. They describe the stages
  // the request really goes through; the server streams nothing, so pretending
  // to track it would be theatre.
  useEffect(() => {
    if (!mutation.isPending) return;
    const timer = setInterval(
      () => setProgress((step) => Math.min(step + 1, PROGRESS_KEYS.length - 1)),
      900,
    );
    return () => clearInterval(timer);
  }, [mutation.isPending]);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    promptRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const trimmed = prompt.trim();
  const canDraft =
    trimmed.length >= AI_PROMPT_MIN_LENGTH &&
    trimmed.length <= AI_PROMPT_MAX_LENGTH &&
    !mutation.isPending;

  // A draft written in a language the reader has since left behind.
  const staleLocale =
    draft !== null && draftLocale !== null && draftLocale !== locale;

  const state: PixelFieldState = mutation.isPending
    ? "thinking"
    : error
      ? "error"
      : draft
        ? "ready"
        : "idle";

  const adjustmentText = (adjustment: AiAdjustment) =>
    t(`ai.adjustment.${adjustment.code}` as TranslationKey, adjustment.values);

  function apply() {
    if (!draft) return;
    onApply(draft.preset);
    setOpen(false);
    launcherRef.current?.focus();
  }

  return (
    <div className={cn("fixed bottom-5 right-5 z-40 print:hidden", className)}>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="mb-3 flex max-h-[min(86vh,760px)] w-[min(calc(100vw-2.5rem),25rem)] flex-col overflow-hidden border border-border bg-surface-1 shadow-[0_18px_40px_rgba(0,0,0,.55)]"
        >
          <header className="relative border-b border-border-soft px-5 py-4">
            <PixelField
              state={state}
              columns={16}
              rows={4}
              className="absolute inset-y-0 right-4 h-full w-24 opacity-70"
            />
            <p className="relative font-mono text-[10px] uppercase tracking-[0.08em] text-[#4d6ad9]">
              {t("ai.launcher.short")}
            </p>
            <h2
              id={titleId}
              className="relative mt-1.5 font-mono text-[15px] font-medium leading-tight text-foreground"
            >
              {t("ai.panel.title")}
            </h2>
            <p className="relative mt-1 max-w-[24ch] text-xs leading-5 text-muted-foreground">
              {t("ai.panel.lede")}
            </p>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <label
              htmlFor={`${titleId}-prompt`}
              className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
            >
              {t("ai.field.prompt.label")}
            </label>
            <textarea
              id={`${titleId}-prompt`}
              ref={promptRef}
              className="field mt-1.5 min-h-24 resize-y"
              maxLength={AI_PROMPT_MAX_LENGTH}
              placeholder={t("ai.field.prompt.placeholder")}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                // Enter drafts; Shift+Enter still writes a new line. A one-line
                // description is the common case, and reaching for the mouse to
                // submit it is the kind of friction this panel exists to remove.
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                // Once a draft is on screen, Enter applies it. Redrafting on
                // the same key would silently swap the preset the reader is
                // reading for a different one, which is the opposite of what
                // pressing Enter again means.
                if (draft) apply();
                else if (canDraft) mutation.mutate();
              }}
            />
            <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 font-mono text-[10px] text-muted-foreground">
              <span>
                {t(
                  draft ? "ai.field.prompt.hintApply" : "ai.field.prompt.hint",
                )}
              </span>
              <span>
                {t("ai.field.prompt.counter", {
                  count: trimmed.length,
                  max: AI_PROMPT_MAX_LENGTH,
                })}
              </span>
            </p>

            <div
              aria-live="polite"
              className="mt-3 min-h-5 font-mono text-[11px] text-muted-foreground"
            >
              {mutation.isPending && `${t(PROGRESS_KEYS[progress])}…`}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-2 rounded-control border border-[rgba(233,131,45,.35)] bg-[rgba(233,131,45,.08)] px-3 py-2 text-xs leading-5 text-[#e9832d]"
              >
                {error}
              </p>
            )}

            {draft && (
              <div className="mt-4 space-y-4 border-t border-border-soft pt-4">
                {staleLocale && (
                  <p className="border border-[rgba(233,131,45,.35)] bg-[rgba(233,131,45,.08)] px-3 py-2 text-xs leading-5 text-[#e9832d]">
                    {t("ai.notice.localeChanged")}
                  </p>
                )}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    {draft.source === "model"
                      ? t("ai.draft.sourceModel")
                      : t("ai.draft.sourceFallback")}
                  </p>
                  <h3 className="mt-1 font-mono text-sm text-foreground">
                    {draft.preset.titleSuggestion}
                  </h3>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">
                      {t("ai.draft.strategy")}
                    </dt>
                    <dd className="text-foreground">
                      {t(strategyKey(draft.preset.strategy, "name"))}
                    </dd>
                    <dt className="text-muted-foreground">
                      {t("ai.draft.allocation")}
                    </dt>
                    <dd className="font-mono text-foreground">
                      {draft.preset.allocationSuggestion}
                    </dd>
                    {draft.preset.timing && (
                      <>
                        <dt className="text-muted-foreground">
                          {t("ai.draft.schedule")}
                        </dt>
                        <dd className="font-mono text-foreground">
                          {draft.preset.timing.cliff} /{" "}
                          {draft.preset.timing.duration}{" "}
                          {t(UNIT_KEYS[draft.preset.timing.unit])}
                        </dd>
                      </>
                    )}
                    {draft.preset.milestones && (
                      <>
                        <dt className="text-muted-foreground">
                          {t("ai.draft.milestones")}
                        </dt>
                        <dd className="font-mono text-foreground">
                          {draft.preset.milestones
                            .map(
                              (milestone) =>
                                `${milestone.percentOfAllocation}%`,
                            )
                            .join(" / ")}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>

                <Section
                  title={t("ai.section.confirm")}
                  items={draft.needsConfirmation.map((code) =>
                    t(`ai.confirm.${code}` as TranslationKey),
                  )}
                />
                <Section
                  title={t("ai.section.adjustments")}
                  items={draft.adjustments.map(adjustmentText)}
                />
                <Section
                  title={t("ai.section.unsupported")}
                  items={draft.unsupported}
                  tone="warning"
                />
                <Section
                  title={t("ai.section.assumptions")}
                  items={draft.assumptions}
                />
              </div>
            )}
          </div>

          <footer className="border-t border-border-soft px-5 py-4">
            <p className="text-[11px] leading-5 text-muted-foreground">
              {t("ai.disclaimer")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft ? (
                <>
                  {staleLocale && (
                    <Button
                      size="sm"
                      disabled={!canDraft}
                      onClick={() => mutation.mutate()}
                    >
                      {t("ai.action.redraft")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={staleLocale ? "outline" : "default"}
                    onClick={apply}
                  >
                    {t("ai.action.apply")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDraft(null);
                      setDraftLocale(null);
                      setError("");
                      promptRef.current?.focus();
                    }}
                  >
                    {t("ai.action.discard")}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  disabled={!canDraft}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending
                    ? t("ai.action.drafting")
                    : error
                      ? t("ai.action.retry")
                      : t("ai.action.draft")}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={close}>
                {t("ai.panel.close")}
              </Button>
            </div>
          </footer>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        aria-label={t("ai.launcher.label")}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          // `rounded-full` rather than a `--radius-pill` utility: globals.css keeps
          // that token in `:root` but exposes only sm/md/lg through `@theme`, so
          // `rounded-pill` compiles to nothing and the launcher renders square.
          "relative ml-auto flex size-14 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-1 shadow-[0_10px_28px_rgba(0,0,0,.5)]",
          "transition-[border-color,background,transform] duration-180 ease-[cubic-bezier(.2,.8,.2,1)]",
          "hover:-translate-y-px hover:border-border-strong hover:bg-surface-hover",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <PixelField
          state={state}
          columns={9}
          rows={9}
          className="absolute inset-0 size-full p-2"
        />
        <span className="relative font-mono text-[11px] font-medium tracking-[0.08em] text-foreground">
          {t("ai.launcher.short")}
        </span>
      </button>
    </div>
  );
}
