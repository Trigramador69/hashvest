"use client";

import { useId, useRef, useState } from "react";
import { useAiTool } from "@/hooks/use-ai-tool";
import type { AiGrantDraftResult } from "@/lib/cloud/ai/draft-service";
import type { GrantPreset } from "@/lib/shared/grant-presets/presets";
import type { TranslationKey } from "@/lib/shared/i18n/dictionaries/en";
import { strategyKey } from "@/lib/shared/i18n/keys";
import { useI18n } from "@/lib/shared/i18n/provider";
import { AiResultList, AiToolSection } from "./ai-tool-section";
import { Button } from "./ui/button";

/** Optional inline tool; applies only through the existing validated preset path. */
export function AiGrantBuilder({
  onApply,
  disabled = false,
}: {
  onApply: (preset: GrantPreset) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [draftLocale, setDraftLocale] = useState(locale);
  const input = useRef<HTMLTextAreaElement>(null);
  const ai = useAiTool<{ draft: AiGrantDraftResult }>("/api/ai/grant-draft");
  const draft = ai.result?.draft;
  const staleLocale = Boolean(draft && draftLocale !== locale);
  const canDraft =
    !disabled &&
    !ai.pending &&
    prompt.trim().length >= 8 &&
    prompt.trim().length <= 400;
  async function generate() {
    const response = await ai.run({ prompt: prompt.trim(), locale });
    if (response) setDraftLocale(locale);
  }
  function apply() {
    if (!draft || disabled || ai.pending) return;
    onApply(draft.preset);
    ai.clear();
    setOpen(false);
  }
  return (
    <AiToolSection
      title={t("ai.panel.title")}
      label={t("ai.launcher.label")}
      description={t("ai.panel.lede")}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
    >
      <label htmlFor={id} className="block text-xs">
        {t("ai.field.prompt.label")}
      </label>
      <textarea
        id={id}
        ref={input}
        className="field min-h-24"
        maxLength={400}
        value={prompt}
        placeholder={t("ai.field.prompt.placeholder")}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          event.stopPropagation();
          if (draft) apply();
          else if (canDraft) void generate();
        }}
      />
      <p className="text-xs text-muted-foreground">
        {t(draft ? "ai.field.prompt.hintApply" : "ai.field.prompt.hint")} ·{" "}
        {t("ai.field.prompt.counter", {
          count: prompt.trim().length,
          max: 400,
        })}
      </p>
      {ai.pending && (
        <p role="status" className="text-xs">
          {t("ai.tools.working")}
        </p>
      )}
      {ai.error && (
        <p role="alert" className="text-xs text-destructive">
          {ai.error}
        </p>
      )}
      {draft && (
        <div className="space-y-4">
          {staleLocale && (
            <p className="text-xs text-muted-foreground">
              {t("ai.notice.localeChanged")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t(
              draft.source === "model"
                ? "ai.draft.sourceModel"
                : "ai.draft.sourceFallback",
            )}
          </p>
          <h3 className="font-mono text-sm">{draft.preset.titleSuggestion}</h3>
          <p className="text-xs">
            {t(strategyKey(draft.preset.strategy, "name"))} ·{" "}
            {t("ai.draft.allocation")}: {draft.preset.allocationSuggestion}
          </p>
          {draft.preset.timing && (
            <p className="text-xs">
              {t("ai.draft.schedule")}: {draft.preset.timing.cliff} /{" "}
              {draft.preset.timing.duration}{" "}
              {t(
                draft.preset.timing.unit === "60"
                  ? "wizard.unit.minutes"
                  : draft.preset.timing.unit === "3600"
                    ? "wizard.unit.hours"
                    : "wizard.unit.days",
              )}
            </p>
          )}
          <AiResultList
            title={t("ai.draft.milestones")}
            items={
              draft.preset.milestones?.map(
                (item) => `${item.title}: ${item.percentOfAllocation}%`,
              ) ?? []
            }
          />
          <AiResultList
            title={t("ai.section.confirm")}
            items={draft.needsConfirmation.map((code) =>
              t(`ai.confirm.${code}` as TranslationKey),
            )}
          />
          <AiResultList
            title={t("ai.section.adjustments")}
            items={draft.adjustments.map((item) =>
              t(`ai.adjustment.${item.code}` as TranslationKey, item.values),
            )}
          />
          <AiResultList
            title={t("ai.section.unsupported")}
            items={draft.unsupported}
          />
          <AiResultList
            title={t("ai.section.assumptions")}
            items={draft.assumptions}
          />
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        {t("ai.disclaimer")}
      </p>
      <div className="flex flex-wrap gap-2">
        {!draft || staleLocale ? (
          <Button
            type="button"
            disabled={!canDraft}
            onClick={() => void generate()}
          >
            {t(
              ai.pending
                ? "ai.action.drafting"
                : staleLocale
                  ? "ai.action.redraft"
                  : ai.error
                    ? "ai.action.retry"
                    : "ai.action.draft",
            )}
          </Button>
        ) : null}
        {draft && (
          <>
            <Button
              type="button"
              disabled={disabled || ai.pending}
              onClick={apply}
            >
              {t("ai.action.apply")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                ai.clear();
                input.current?.focus();
              }}
            >
              {t("ai.action.discard")}
            </Button>
          </>
        )}
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("ai.panel.close")}
        </Button>
      </div>
    </AiToolSection>
  );
}
