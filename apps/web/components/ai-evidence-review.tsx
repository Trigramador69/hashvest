"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { useAiTool } from "@/hooks/use-ai-tool";
import { useSession } from "@/hooks/use-session";
import {
  reviewStateKey,
  type AiReviewResult,
  type ReviewStatement,
} from "@/lib/shared/ai-tools/review";
import { useI18n } from "@/lib/shared/i18n/provider";
import { AiCopyButton, AiToolSection } from "./ai-tool-section";
import { Button } from "./ui/button";

type Props = {
  organizationId: string;
  vaultAddress: string;
  currentStateKey: string;
  evidenceKey: string;
  disabled?: boolean;
  /**
   * Anchor for the milestone a cited note belongs to. Optional because the
   * gated fixture renders this tool without a milestone list beside it.
   */
  milestoneAnchor?: (milestoneIndex: number) => string;
};
function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/** Session changes unmount all private text, including in-flight results. */
export function AiEvidenceReview(props: Props) {
  const session = useSession();
  if (!session.walletMatches || !session.session) return null;
  return (
    <EvidenceReviewTool
      key={`${props.organizationId}:${props.vaultAddress}:${session.session.walletAddress}:${session.session.expiresAt}`}
      {...props}
    />
  );
}

/** The same read-only view is exercised by the production-gated browser fixture. */
export function EvidenceReviewTool({
  organizationId,
  vaultAddress,
  currentStateKey,
  evidenceKey,
  disabled = false,
  milestoneAnchor,
}: Props) {
  const { t, locale } = useI18n();
  const id = useId().replace(/:/g, "");
  const linked = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash === "#ai-evidence-review",
    () => false,
  );
  const [open, setOpen] = useState<boolean>();
  const [generatedContext, setGeneratedContext] = useState({
    evidenceKey,
    locale,
  });
  const [clock, setClock] = useState(() => Date.now());
  const ai = useAiTool<AiReviewResult>(
    `/api/organizations/${organizationId}/grants/${vaultAddress}/ai/review`,
  );
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const result = ai.result;
  const stale = Boolean(
    result &&
    (disabled ||
      generatedContext.evidenceKey !== evidenceKey ||
      generatedContext.locale !== locale ||
      reviewStateKey(result.snapshot) !== currentStateKey ||
      clock - Date.parse(result.checkedAt) > 300000),
  );
  function citations(statement: ReviewStatement) {
    return (
      <>
        <span className="break-words">{statement.text}</span>
        <span className="ml-2 inline-flex flex-wrap gap-2">
          {statement.sourceIds.map((sourceId) => (
            <a
              key={sourceId}
              className="text-primary underline"
              href={`#${id}-${sourceId}`}
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
  function sourceLabel(sourceId: string) {
    const source = result?.sources.find((item) => item.id === sourceId);
    return source?.kind === "evidence"
      ? t("ai.review.evidenceSource", {
          index: (source.milestoneIndex ?? 0) + 1,
        })
      : t("ai.review.chainSource");
  }
  async function analyze() {
    const context = { evidenceKey, locale };
    const response = await ai.run({ locale });
    if (response) {
      setGeneratedContext(context);
      setClock(Date.now());
    }
  }
  /** Plain text for a reviewer's own notes; the citations travel with it. */
  function asText() {
    const review = result?.review;
    if (!review) return "";
    const sections = (
      ["summary", "findings", "questions", "uncertainty"] as const
    ).map(
      (section) =>
        `${t(`ai.review.${section}`)}\n${review[section]
          .map(
            (statement) =>
              `- ${statement.text} (${statement.sourceIds
                .map(sourceLabel)
                .join("; ")})`,
          )
          .join("\n")}`,
    );
    return [
      t("ai.review.title"),
      t("ai.review.checkedAt", {
        date: new Date(result!.checkedAt).toLocaleString(locale),
        block: result!.snapshot.blockNumber,
      }),
      ...sections,
      `${t("ai.review.recommendation")}\n- ${t(`ai.review.${review.recommendation.value}`)}: ${review.recommendation.rationale.text}`,
      t("ai.review.linksUnread"),
      t("ai.review.disclaimer"),
    ].join("\n\n");
  }
  return (
    <AiToolSection
      id="ai-evidence-review"
      title={t("ai.review.title")}
      description={t("ai.review.lede")}
      tone="review"
      open={open ?? linked}
      onOpenChange={setOpen}
    >
      <p className="text-xs leading-5 text-muted-foreground">
        {t("ai.review.linksUnread")}
      </p>
      <Button
        type="button"
        disabled={disabled || ai.pending}
        onClick={() => void analyze()}
      >
        {t(ai.pending ? "ai.tools.working" : "ai.review.generate")}
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
            {t("ai.review.checkedAt", {
              date: new Date(result.checkedAt).toLocaleString(locale),
              block: result.snapshot.blockNumber,
            })}
          </p>
          {stale && (
            <div
              role="status"
              className="space-y-2 border border-border p-3 text-xs"
            >
              <p>{t("ai.review.stale")}</p>
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
          {result.missingNotes && (
            <p className="text-xs text-muted-foreground">
              {t("ai.review.missingNotes")}
            </p>
          )}
          {result.redacted && (
            <p className="text-xs text-muted-foreground">
              {t("ai.tools.redacted")}
            </p>
          )}
          {!result.review && (
            <p role="status" className="text-xs">
              {t("ai.review.unavailable")}
            </p>
          )}
          {result.review && (
            <>
              {(
                ["summary", "findings", "questions", "uncertainty"] as const
              ).map((section) =>
                result.review![section].length ? (
                  <div key={section}>
                    <h3 className="text-xs font-medium">
                      {t(`ai.review.${section}`)}
                    </h3>
                    <ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-5 text-muted-foreground">
                      {result.review![section].map((statement, index) => (
                        <li key={index}>{citations(statement)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
              {!stale && (
                <div className="border border-border p-3 text-xs leading-5">
                  <h3 className="font-medium">
                    {t("ai.review.recommendation")}
                  </h3>
                  <p className="mt-2">
                    {t(`ai.review.${result.review.recommendation.value}`)}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {citations(result.review.recommendation.rationale)}
                  </p>
                </div>
              )}
            </>
          )}
          <div>
            <h3 className="text-xs font-medium">{t("ai.review.sources")}</h3>
            <ol className="mt-2 space-y-2 text-xs">
              {result.sources.map((source, index) => (
                <li
                  key={source.id}
                  id={`${id}-${source.id}`}
                  className="scroll-mt-5 break-words"
                >
                  {index + 1}.{" "}
                  {source.href ? (
                    <a
                      className="text-primary underline"
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {sourceLabel(source.id)}
                    </a>
                  ) : (
                    sourceLabel(source.id)
                  )}
                  <p className="mt-1 text-muted-foreground">
                    {t("ai.review.evidenceDate", {
                      date: new Date(source.updatedAt).toLocaleString(locale),
                    })}
                  </p>
                  {milestoneAnchor && source.kind === "evidence" && (
                    <a
                      className="text-primary underline"
                      href={milestoneAnchor(source.milestoneIndex ?? 0)}
                    >
                      {t("ai.review.openMilestone", {
                        index: (source.milestoneIndex ?? 0) + 1,
                      })}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {result.review && <AiCopyButton text={asText} />}
            <Button type="button" variant="outline" onClick={ai.clear}>
              {t("ai.action.discard")}
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        {t("ai.review.disclaimer")}
      </p>
    </AiToolSection>
  );
}
