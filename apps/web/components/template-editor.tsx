"use client";

import type { FormEvent } from "react";

import {
  milestonePercentTotal,
  type TemplateForm,
  type TemplateFormIssue,
} from "@/lib/shared/grant-presets/template-form";
import { strategyKey } from "@/lib/shared/i18n/keys";
import { useTranslations } from "@/lib/shared/i18n/provider";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const MAX_MILESTONES = 20;
const EMPTY_REVIEWER_VALUE = "__empty_reviewer__";

/**
 * The template form (HAS-13), with no data source of its own.
 *
 * Every value, problem and pending flag is passed in, so the same form renders
 * for a real owner in `TemplatesManager` and for the guarded visual fixture
 * that covers its states — including on a phone, where the milestone rows and
 * schedule fields stack. Its rules live in
 * lib/shared/grant-presets/template-form.ts and are tested there.
 */
export function TemplateEditor({
  mode,
  form,
  onChange,
  members,
  issues,
  showIssues,
  error,
  pending,
  onSubmit,
  onCancel,
}: {
  mode: "new" | "edit";
  form: TemplateForm;
  onChange: (patch: Partial<TemplateForm>) => void;
  members: readonly { id: string; displayName: string }[];
  issues: readonly TemplateFormIssue[];
  /** Problems stay hidden until the reader tries to save, then stay visible. */
  showIssues: boolean;
  error?: string;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations();

  function updateMilestone(
    index: number,
    patch: Partial<TemplateForm["milestones"][number]>,
  ) {
    onChange({
      milestones: form.milestones.map((milestone, position) =>
        position === index ? { ...milestone, ...patch } : milestone,
      ),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t(mode === "new" ? "templates.new" : "templates.edit")}
        </CardTitle>
        <p className="pt-2 text-sm leading-6 text-muted-foreground">
          {t("templates.form.lede")}
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <label className="block space-y-2">
            <span className="text-sm font-medium">
              {t("templates.field.name")}
            </span>
            <input
              className="field"
              value={form.name}
              onChange={(event) => onChange({ name: event.target.value })}
              maxLength={80}
              placeholder={t("templates.field.name.placeholder")}
              autoComplete="off"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">
              {t("templates.field.description")}
            </span>
            <textarea
              className="field min-h-20 resize-y"
              value={form.description}
              onChange={(event) =>
                onChange({ description: event.target.value })
              }
              maxLength={1000}
              placeholder={t("templates.field.description.placeholder")}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">
              {t("templates.field.strategy")}
            </span>
            <Select
              value={String(form.strategy)}
              onValueChange={(value) =>
                onChange({ strategy: Number(value) as 0 | 1 | 2 })
              }
            >
              <SelectTrigger className="w-full font-sans text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {([0, 1, 2] as const).map((index) => (
                  <SelectItem
                    key={index}
                    value={String(index)}
                    className="font-sans text-sm"
                  >
                    {t(strategyKey(index, "name"))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {form.strategy !== 1 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t("wizard.field.unit.label")}
                </span>
                <Select
                  value={form.unit}
                  onValueChange={(value) => onChange({ unit: value })}
                >
                  <SelectTrigger className="w-full font-sans text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="60" className="font-sans text-sm">
                      {t("wizard.unit.minutes")}
                    </SelectItem>
                    <SelectItem value="3600" className="font-sans text-sm">
                      {t("wizard.unit.hours")}
                    </SelectItem>
                    <SelectItem value="86400" className="font-sans text-sm">
                      {t("wizard.unit.days")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t("wizard.field.cliff.label")}
                </span>
                <input
                  className="field"
                  inputMode="numeric"
                  value={form.cliff}
                  onChange={(event) => onChange({ cliff: event.target.value })}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t("wizard.field.duration.label")}
                </span>
                <input
                  className="field"
                  inputMode="numeric"
                  value={form.duration}
                  onChange={(event) =>
                    onChange({ duration: event.target.value })
                  }
                />
              </label>
            </div>
          )}
          {form.strategy !== 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium">
                  {t("templates.field.milestones")}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("templates.field.milestones.hint")}
                </p>
              </div>
              {form.milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-end"
                >
                  <label className="block space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("templates.field.milestone.title", {
                        index: index + 1,
                      })}
                    </span>
                    <input
                      className="field"
                      value={milestone.title}
                      onChange={(event) =>
                        updateMilestone(index, { title: event.target.value })
                      }
                      maxLength={120}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("templates.field.milestone.percent")}
                    </span>
                    <input
                      className="field"
                      inputMode="numeric"
                      value={milestone.percent}
                      onChange={(event) =>
                        updateMilestone(index, { percent: event.target.value })
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={form.milestones.length === 1}
                    onClick={() =>
                      onChange({
                        milestones: form.milestones.filter(
                          (_, position) => position !== index,
                        ),
                      })
                    }
                  >
                    {t("templates.milestone.remove")}
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={form.milestones.length >= MAX_MILESTONES}
                  onClick={() =>
                    onChange({
                      milestones: [
                        ...form.milestones,
                        { title: "", percent: "" },
                      ],
                    })
                  }
                >
                  {t("templates.milestone.add")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t("templates.milestone.total", {
                    total: milestonePercentTotal(form.milestones),
                  })}
                </p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t("templates.field.reviewer")}
                </span>
                <Select
                  value={form.defaultReviewerMemberId || EMPTY_REVIEWER_VALUE}
                  onValueChange={(value) =>
                    onChange({
                      defaultReviewerMemberId:
                        value === EMPTY_REVIEWER_VALUE ? "" : value,
                    })
                  }
                >
                  <SelectTrigger
                    className={`w-full font-sans text-sm ${form.defaultReviewerMemberId ? "" : "text-muted-foreground"}`}
                  >
                    <SelectValue
                      placeholder={t("templates.field.reviewer.none")}
                    />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem
                      value={EMPTY_REVIEWER_VALUE}
                      className="font-sans text-sm"
                    >
                      {t("templates.field.reviewer.none")}
                    </SelectItem>
                    {members.map((member) => (
                      <SelectItem
                        key={member.id}
                        value={member.id}
                        className="font-sans text-sm"
                      >
                        {member.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="block text-xs leading-5 text-muted-foreground">
                  {t("templates.field.reviewer.hint")}
                </span>
              </label>
            </div>
          )}
          <label className="block space-y-2">
            <span className="text-sm font-medium">
              {t("templates.field.allocation")}
            </span>
            <input
              className="field"
              inputMode="decimal"
              value={form.allocationSuggestion}
              onChange={(event) =>
                onChange({ allocationSuggestion: event.target.value })
              }
              placeholder="1000"
              autoComplete="off"
            />
            <span className="block text-xs leading-5 text-muted-foreground">
              {t("templates.field.allocation.hint")}
            </span>
          </label>
          {showIssues && issues.length > 0 && (
            <ul role="alert" className="space-y-1 text-sm text-destructive">
              {issues.map((issue) => (
                <li key={`${issue.key}${JSON.stringify(issue.values)}`}>
                  {t(issue.key, issue.values)}
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? t("templates.saving") : t("templates.save")}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("templates.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
