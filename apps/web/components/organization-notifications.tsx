"use client";

import Link from "next/link";

import { useOrganizationNotifications } from "@/hooks/use-organization-notifications";
import type {
  GrantNotification,
  GrantNotificationKind,
} from "@/lib/dashboard/organization-notifications";
import { dateLabel, tokenAmount } from "@/lib/protocol/grants";
import type { TranslationKey } from "@/lib/shared/i18n/dictionaries/en";
import type { Translator } from "@/lib/shared/i18n/dictionary";
import { useTranslations } from "@/lib/shared/i18n/provider";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const TITLE_KEY: Record<GrantNotificationKind, TranslationKey> = {
  milestonePendingReview: "notify.kind.milestonePendingReview",
  claimable: "notify.kind.claimable",
  cliffReached: "notify.kind.cliffReached",
  vestingComplete: "notify.kind.vestingComplete",
  completed: "notify.kind.completed",
  revoked: "notify.kind.revoked",
  syncUnavailable: "notify.kind.syncUnavailable",
};

/**
 * Why this notification exists, in the member's own terms.
 *
 * Each reason names the vault field the derivation looked at, so a member can
 * check the claim against the grant rather than having to trust the panel.
 */
function reasonFor(notification: GrantNotification, t: Translator): string {
  const { detail } = notification;
  const amount =
    detail.amount !== undefined && detail.decimals !== undefined
      ? `${tokenAmount(detail.amount, detail.decimals)} ${detail.symbol ?? ""}`.trim()
      : "";
  switch (notification.kind) {
    case "milestonePendingReview":
      return t("notify.reason.milestonePendingReview", {
        position: (detail.milestoneIndex ?? 0) + 1,
        milestone: detail.milestoneTitle ?? "",
        amount,
      });
    case "claimable":
      return t("notify.reason.claimable", { amount });
    case "cliffReached":
      return t("notify.reason.cliffReached", {
        date: dateLabel(BigInt(detail.at ?? 0)),
      });
    case "vestingComplete":
      return t("notify.reason.vestingComplete", {
        date: dateLabel(BigInt(detail.at ?? 0)),
      });
    case "completed":
      return t("notify.reason.completed", { amount });
    case "revoked":
      return t("notify.reason.revoked", {
        date: dateLabel(BigInt(detail.at ?? 0)),
      });
    case "syncUnavailable":
      return t("notify.reason.syncUnavailable");
  }
}

function NotificationItem({
  notification,
  onMarkRead,
  disabled,
}: {
  notification: GrantNotification;
  onMarkRead: () => void;
  disabled: boolean;
}) {
  const t = useTranslations();
  const unverified = notification.confidence === "unverified";
  return (
    <li
      className={`space-y-2 border-b border-border-soft pb-4 last:border-0 last:pb-0 ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {!notification.read && (
          <span
            aria-label={t("notify.unread")}
            className="size-2 shrink-0 rounded-full bg-primary"
          />
        )}
        <p className="font-medium">{t(TITLE_KEY[notification.kind])}</p>
        <span
          className={`rounded-control px-2 py-0.5 font-mono text-[10px] uppercase ${
            unverified
              ? "bg-[rgba(233,131,45,.12)] text-[#E9832D]"
              : "bg-surface-2 text-muted-foreground"
          }`}
        >
          {t(
            unverified
              ? "notify.confidence.unverified"
              : "notify.confidence.confirmed",
          )}
        </span>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {reasonFor(notification, t)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="text-sm font-medium text-primary hover:underline"
          href={notification.href}
        >
          {t("notify.open")} <span aria-hidden>→</span>
        </Link>
        {!notification.read && (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 disabled:opacity-50"
            onClick={onMarkRead}
            disabled={disabled}
          >
            {t("notify.markRead")}
          </button>
        )}
      </div>
    </li>
  );
}

export function OrganizationNotifications({
  organizationId,
}: {
  organizationId: string;
}) {
  const t = useTranslations();
  const {
    notifications,
    unreadCount,
    partial,
    isPending,
    hasError,
    markRead,
    mark,
  } = useOrganizationNotifications(organizationId);
  const unread = notifications.filter((notification) => !notification.read);
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{t("notify.title")}</CardTitle>
          {unreadCount > 0 && (
            <span className="rounded-control bg-[rgba(87,217,139,.12)] px-2 py-0.5 font-mono text-xs text-primary">
              {t("notify.unreadCount", { count: unreadCount })}
            </span>
          )}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {t("notify.lede")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <p className="text-sm text-muted-foreground">{t("notify.loading")}</p>
        ) : hasError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("notify.error")}
          </p>
        ) : !notifications.length ? (
          <p className="rounded-card border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            {t("notify.empty")}
          </p>
        ) : (
          <>
            {partial && (
              <p className="text-xs leading-5 text-[#E9832D]">
                {t("notify.partial")}
              </p>
            )}
            <ul className="space-y-4">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.key}
                  notification={notification}
                  disabled={markRead.isPending}
                  onMarkRead={() => void mark([notification])}
                />
              ))}
            </ul>
            {unread.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={markRead.isPending}
                onClick={() => void mark(unread)}
              >
                {markRead.isPending
                  ? t("notify.markingAll")
                  : t("notify.markAllRead")}
              </Button>
            )}
            {markRead.isError && (
              <p role="alert" className="text-xs text-destructive">
                {t("notify.markError")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
