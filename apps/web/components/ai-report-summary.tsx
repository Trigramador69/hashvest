"use client";

import { useEffect, useState } from "react";

import { useAiTool } from "@/hooks/use-ai-tool";
import {
  reportStateKey,
  type AiReportResult,
  type ReportStatement,
} from "@/lib/shared/ai-tools/report";
import { useI18n } from "@/lib/shared/i18n/provider";

import { AiCopyButton, AiToolSection } from "./ai-tool-section";
import { Button } from "./ui/button";

type Props = {
  organizationId: string;
  /** The report the browser derived, used only to notice the summary went stale. */
  currentStateKey: string;
  disabled?: boolean;
};

/**
 * An advisory reading of the organization report (HAS-17).
 *
 * The narrative never carries authority: the server re-reads the same vaults
 * itself, every sentence cites a section of this page, and the result lives in
 * component state only.
 */
export function AiReportSummary({
  organizationId,
  currentStateKey,
  disabled = false,
}: Props) {
  const { t, locale } = useI18n();
  const [generatedLocale, setGeneratedLocale] = useState(locale);
  const [clock, setClock] = useState(() => Date.now());
  const ai = useAiTool<AiReportResult>(
    `/api/organizations/${organizationId}/ai/report`,
  );
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const result = ai.result;
  const stale = Boolean(
    result &&
    (disabled ||
      generatedLocale !== locale ||
      reportStateKey({
        lifecycle: result.facts.lifecycle,
        viewer: result.facts.viewer,
        tokenGroups: result.facts.tokenGroups,
        unreadableVaults: [],
      }) !== currentStateKey ||
      clock - Date.parse(result.checkedAt) > 300000),
  );
  function sourceLabel(sourceId: string) {
    const source = result?.sources.find((item) => item.id === sourceId);
    if (!source) return sourceId;
    return source.kind === "token"
      ? t("ai.report.tokenSource", { symbol: source.symbol ?? "" })
      : t(`ai.report.source.${source.kind}`);
  }
  function citations(statement: ReportStatement) {
    return (
      <>
        <span className="break-words">{statement.text}</span>
        <span className="ml-2 inline-flex flex-wrap gap-2">
          {statement.sourceIds.map((sourceId) => (
            <a
              key={sourceId}
              className="text-primary underline"
              href={`#${result?.sources.find((item) => item.id === sourceId)?.anchor ?? ""}`}
              aria-label={sourceLabel(sourceId)}
            >
              [
              {(result?.sources.findIndex((source) => source.id === sourceId) ??
                0) + 1}
              ]
            </a>
          ))}
        </span>
      </>
    );
  }
  async function analyze() {
    const response = await ai.run({ locale });
    if (response) {
      setGeneratedLocale(locale);
      setClock(Date.now());
    }
  }
  function asText() {
    if (!result?.report) return "";
    const sections = (["summary", "watchlist", "uncertainty"] as const).map(
      (section) =>
        `${t(`ai.report.${section}`)}\n${result
          .report![section].map(
            (statement) =>
              `- ${statement.text} (${statement.sourceIds
                .map(sourceLabel)
                .join("; ")})`,
          )
          .join("\n")}`,
    );
    return [
      t("ai.report.title"),
      t("ai.report.checkedAt", {
        date: new Date(result.checkedAt).toLocaleString(locale),
        grants: result.facts.includedGrants,
      }),
      ...sections,
      t("ai.report.disclaimer"),
    ].join("\n\n");
  }
  return (
    <AiToolSection
      id="ai-report-summary"
      title={t("ai.report.title")}
      description={t("ai.report.lede")}
      tone="report"
      disabled={disabled}
    >
      <p className="text-xs leading-5 text-muted-foreground">
        {t("ai.report.noPrices")}
      </p>
      <Button
        type="button"
        disabled={disabled || ai.pending}
        onClick={() => void analyze()}
      >
        {t(ai.pending ? "ai.tools.working" : "ai.report.generate")}
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
      {result && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {t("ai.report.checkedAt", {
              date: new Date(result.checkedAt).toLocaleString(locale),
              grants: result.facts.includedGrants,
            })}
          </p>
          {stale && (
            <div
              role="status"
              className="space-y-2 border border-border p-3 text-xs"
            >
              <p>{t("ai.report.stale")}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || ai.pending}
                onClick={() => void analyze()}
              >
                {t("ai.action.regenerate")}
              </Button>
            </div>
          )}
          {result.facts.omittedGrants > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("ai.report.omitted", { count: result.facts.omittedGrants })}
            </p>
          )}
          {result.redacted && (
            <p className="text-xs text-muted-foreground">
              {t("ai.tools.redacted")}
            </p>
          )}
          {!result.report && (
            <p role="status" className="text-xs">
              {t("ai.report.unavailable")}
            </p>
          )}
          {result.report && (
            <>
              {(["summary", "watchlist", "uncertainty"] as const).map(
                (section) =>
                  result.report![section].length ? (
                    <div key={section}>
                      <h3 className="text-xs font-medium">
                        {t(`ai.report.${section}`)}
                      </h3>
                      <ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-5 text-muted-foreground">
                        {result.report![section].map((statement, index) => (
                          <li key={index}>{citations(statement)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
              )}
              <div>
                <h3 className="text-xs font-medium">
                  {t("ai.review.sources")}
                </h3>
                <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {result.sources.map((source, index) => (
                    <li key={source.id} className="break-words">
                      {index + 1}.{" "}
                      <a
                        className="text-primary underline"
                        href={`#${source.anchor}`}
                      >
                        {sourceLabel(source.id)}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {result.report && <AiCopyButton text={asText} />}
            <Button type="button" variant="outline" onClick={ai.clear}>
              {t("ai.action.discard")}
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        {t("ai.report.disclaimer")}
      </p>
    </AiToolSection>
  );
}
