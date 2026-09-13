"use client";

import { findMemberByWallet } from "@/lib/cloud/members";
import type {
  OrganizationMember,
  OrganizationMilestoneEvidence,
} from "@/lib/cloud/organizations/types";
import {
  safeMilestoneEvidenceHref,
  type MilestoneEvidenceType,
} from "@/lib/shared/milestone-evidence";
import { shortAddress } from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";

import { Button } from "./ui/button";

type EvidenceMilestone = {
  index: number;
  title: string;
};

type MilestoneEvidenceListProps = {
  evidence: readonly OrganizationMilestoneEvidence[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  milestones: readonly EvidenceMilestone[];
  members: OrganizationMember[] | undefined;
  compact?: boolean;
};

function evidenceTypeLabel(
  evidenceType: MilestoneEvidenceType,
  t: ReturnType<typeof useTranslations>,
) {
  switch (evidenceType) {
    case "github_pr":
      return t("detail.evidence.type.githubPr");
    case "github_commit":
      return t("detail.evidence.type.githubCommit");
    case "deployment":
      return t("detail.evidence.type.deployment");
    case "document":
      return t("detail.evidence.type.document");
    case "hsk_transaction":
      return t("detail.evidence.type.hskTransaction");
    case "ipfs":
      return t("detail.evidence.type.ipfs");
  }
}

function evidenceDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function EvidenceRecord({
  evidence,
  members,
}: {
  evidence: OrganizationMilestoneEvidence;
  members: OrganizationMember[] | undefined;
}) {
  const t = useTranslations();
  const member = findMemberByWallet(members, evidence.submittedByWallet);
  const href = safeMilestoneEvidenceHref(
    evidence.evidenceUrl,
    evidence.evidenceType,
  );
  return (
    <article className="rounded-card border border-border-soft bg-surface-1 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">
          {evidenceTypeLabel(evidence.evidenceType, t)}
        </p>
        <span className="font-mono text-[10px] text-primary">
          {t("detail.evidence.status.submitted")}
        </span>
      </div>
      {href ? (
        <a
          className="mt-2 block break-all text-primary underline underline-offset-4"
          href={href}
          target="_blank"
          rel="noreferrer noopener"
        >
          {href} ↗
        </a>
      ) : (
        <p className="mt-2 break-words text-xs text-[#E9832D]" role="alert">
          {t("detail.evidence.unsafeLink")}
        </p>
      )}
      {evidence.note && (
        <p className="mt-3 whitespace-pre-wrap break-words leading-6">
          <span className="text-muted-foreground">
            {t("detail.evidence.note")}:
          </span>{" "}
          {evidence.note}
        </p>
      )}
      <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <dt>{t("detail.evidence.submitter")}</dt>
          <dd className="mt-1 break-all text-foreground">
            {member?.displayName ?? shortAddress(evidence.submittedByWallet)}
          </dd>
        </div>
        <div>
          <dt>{t("detail.evidence.created")}</dt>
          <dd className="mt-1 text-foreground">
            <time dateTime={evidence.createdAt}>
              {evidenceDate(evidence.createdAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt>{t("detail.evidence.updated")}</dt>
          <dd className="mt-1 text-foreground">
            <time dateTime={evidence.updatedAt}>
              {evidenceDate(evidence.updatedAt)}
            </time>
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function MilestoneEvidenceList({
  evidence,
  isPending,
  isError,
  onRetry,
  milestones,
  members,
  compact = false,
}: MilestoneEvidenceListProps) {
  const t = useTranslations();
  return (
    <section
      className={compact ? "space-y-3" : "space-y-4 border-t pt-5"}
      aria-labelledby={compact ? undefined : "milestone-evidence-title"}
    >
      <h3
        id={compact ? undefined : "milestone-evidence-title"}
        className="font-mono text-sm font-normal"
      >
        {t(
          compact ? "overview.review.evidence.title" : "detail.evidence.title",
        )}
      </h3>
      {isPending ? (
        <p className="text-xs text-muted-foreground">
          {t("detail.evidence.loading")}
        </p>
      ) : isError ? (
        <div className="space-y-2" role="alert">
          <p className="text-xs text-destructive">
            {t("detail.evidence.error")}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t("detail.evidence.retry")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const records = (evidence ?? []).filter(
              (item) => item.milestoneIndex === milestone.index,
            );
            return (
              <div key={milestone.index} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {milestone.index + 1}. {milestone.title}
                </p>
                {records.length ? (
                  records.map((item) => (
                    <EvidenceRecord
                      key={`${item.chainId}:${item.vaultAddress}:${item.milestoneIndex}`}
                      evidence={item}
                      members={members}
                    />
                  ))
                ) : (
                  <p className="rounded-card border border-dashed border-border p-3 text-xs text-muted-foreground">
                    {t("detail.evidence.empty")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
