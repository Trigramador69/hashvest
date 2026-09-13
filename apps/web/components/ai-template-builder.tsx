"use client";

import { useId, useState } from "react";
import { useAiTool } from "@/hooks/use-ai-tool";
import type { AiTemplateDraft } from "@/lib/shared/ai-tools/template";
import {
  assertValidOrganizationTemplate,
  type OrganizationTemplateContent,
} from "@/lib/shared/grant-presets/organization-template";
import type { TranslationKey } from "@/lib/shared/i18n/dictionaries/en";
import { useI18n } from "@/lib/shared/i18n/provider";
import { strategyKey } from "@/lib/shared/i18n/keys";
import { AiResultList, AiToolSection } from "./ai-tool-section";
import { Button } from "./ui/button";

/** Starting points, not presets: each only fills the box the owner then edits. */
const EXAMPLE_KEYS = [
  "ai.templates.example.milestones",
  "ai.templates.example.vesting",
  "ai.templates.example.hybrid",
] as const satisfies readonly TranslationKey[];

export function AiTemplateBuilder({
  organizationId,
  onApply,
  dirty,
  disabled = false,
}: {
  organizationId: string;
  onApply: (template: OrganizationTemplateContent) => void;
  dirty: boolean;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draftLocale, setDraftLocale] = useState(locale);
  const ai = useAiTool<{ draft: AiTemplateDraft | null; unavailable: boolean }>(
    `/api/organizations/${organizationId}/ai/template-draft`,
  );
  const draft = ai.result?.draft;
  async function generate() {
    setConfirming(false);
    const response = await ai.run({ prompt, locale });
    if (response) setDraftLocale(locale);
  }
  function apply() {
    if (!draft) return;
    assertValidOrganizationTemplate(draft.template);
    onApply(draft.template);
    setConfirming(false);
    ai.clear();
    setOpen(false);
  }
  return (
    <AiToolSection
      title={t("ai.templates.title")}
      description={t("ai.templates.lede")}
      tone="template"
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
    >
      <label className="block space-y-2" htmlFor={id}>
        <span className="text-xs">{t("ai.templates.prompt")}</span>
        <textarea
          id={id}
          className="field min-h-24"
          maxLength={400}
          placeholder={t("ai.templates.prompt.placeholder")}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {t("ai.templates.examples")}
        </span>
        {EXAMPLE_KEYS.map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || ai.pending}
            onClick={() => setPrompt(t(key))}
          >
            {t(`${key}.label` as TranslationKey)}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        disabled={disabled || ai.pending || prompt.trim().length < 8}
        onClick={() => void generate()}
      >
        {t(ai.pending ? "ai.action.drafting" : "ai.action.draft")}
      </Button>
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
      {ai.result?.unavailable && (
        <p role="status" className="text-xs text-muted-foreground">
          {t("ai.templates.unavailable")}
        </p>
      )}
      {draft && (
        <div className="space-y-4">
          {draftLocale !== locale && (
            <p className="text-xs text-muted-foreground">
              {t("ai.notice.localeChanged")}
            </p>
          )}
          <h3 className="font-mono text-sm">{draft.template.name}</h3>
          <p className="text-xs text-muted-foreground">
            {draft.template.description}
          </p>
          <p className="text-xs">
            {t(strategyKey(draft.template.strategy, "name"))}
          </p>
          {draft.template.schedule && (
            <p className="font-mono text-xs">
              {t("ai.draft.schedule")}: {draft.template.schedule.cliffUnits} /{" "}
              {draft.template.schedule.durationUnits}{" "}
              {t(
                draft.template.schedule.unitSeconds === 60
                  ? "wizard.unit.minutes"
                  : draft.template.schedule.unitSeconds === 3600
                    ? "wizard.unit.hours"
                    : "wizard.unit.days",
              )}
            </p>
          )}
          {draft.template.allocationSuggestion && (
            <p className="text-xs">
              {t("ai.draft.allocation")}: {draft.template.allocationSuggestion}
            </p>
          )}
          <AiResultList
            title={t("ai.draft.milestones")}
            items={
              draft.template.milestones?.map(
                (item) => `${item.title}: ${item.percentOfAllocation}%`,
              ) ?? []
            }
          />
          <AiResultList
            title={t("ai.section.assumptions")}
            items={draft.assumptions}
          />
          <AiResultList
            title={t("ai.section.unsupported")}
            items={draft.unsupported}
          />
          {draft.redacted && (
            <p className="text-xs text-muted-foreground">
              {t("ai.tools.redacted")}
            </p>
          )}
          {confirming ? (
            <div
              role="alert"
              className="space-y-3 border border-border p-3 text-xs leading-5"
            >
              <p>{t("ai.tools.replace")}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={apply}>
                  {t("ai.tools.replaceConfirm")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirming(false)}
                >
                  {t("ai.action.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={disabled || draftLocale !== locale}
                onClick={() => (dirty ? setConfirming(true) : apply())}
              >
                {t("ai.templates.apply")}
              </Button>
              <Button type="button" variant="outline" onClick={ai.clear}>
                {t("ai.action.discard")}
              </Button>
            </div>
          )}
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        {t("ai.templates.disclaimer")}
      </p>
    </AiToolSection>
  );
}
