"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { getAddress, zeroAddress, type Address } from "viem";
import { grantVaultAbi, hskTestnet } from "@hashvest/web3";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddressDisplay,
  FundingHealthSummary,
  GrantLifecycleBadge,
  NetworkNotice,
  Notice,
  PageHeading,
  Progress,
  TransactionStatus,
} from "@/components/grant-ui";
import { useGrant } from "@/hooks/use-grant";
import {
  useGrantContext,
  useOrganizationMembers,
} from "@/hooks/use-organizations";
import {
  assertTestnetWallet,
  getWalletGuardMessages,
  useTransaction,
} from "@/hooks/use-transaction";
import {
  dateLabel,
  errorMessage,
  percent,
  tokenAmount,
} from "@/lib/protocol/grants";
import { strategyKey } from "@/lib/shared/i18n/keys";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { deriveGrantState } from "@/lib/protocol/grant-state";
import { deriveRevocationPreview } from "@/lib/protocol/revocation";
import { ParticipantIdentity } from "./grant-card";
import { resolveProtocolRoles } from "@/lib/protocol/roles";
import { useGrantPresets } from "@/lib/shared/grant-presets/use-grant-presets";

/** Protocol literals: never translated, only interpolated into messages. */
const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };
/** Matches the refetch interval in useGrant. */
const REFRESH_SECONDS = 7;

export function GrantDetail({ address }: { address: Address }) {
  const t = useTranslations();
  const walletMessages = getWalletGuardMessages(t);
  const { templateLabel } = useGrantPresets();
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const grant = useGrant(address);
  const grantContext = useGrantContext(address);
  const organizationMembers = useOrganizationMembers(
    grantContext.data?.organization.id,
  );
  const wallet = useAccount();
  const client = usePublicClient({ chainId: 133 });
  const { writeContractAsync } = useWriteContract();
  const tx = useTransaction();

  if (grant.isPending)
    return (
      <Notice title={t("detail.loading.title")}>
        <p>{t("detail.loading.body", NETWORK)}</p>
      </Notice>
    );
  if (!grant.data)
    return (
      <div className="space-y-5">
        <Link className="text-sm text-primary" href="/app">
          <span aria-hidden>←</span> {t("detail.back")}
        </Link>
        <Notice title={t("detail.error.title")} error>
          <p>{t("detail.error.body", NETWORK)}</p>
          <p className="mt-2 break-words">
            {errorMessage(grant.error, {
              fallback: t("ui.error.requestFailed"),
              rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
            })}
          </p>
          <div className="mt-3">
            <AddressDisplay address={address} full />
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void grant.refetch()}
          >
            {t("detail.retry")}
          </Button>
        </Notice>
      </div>
    );
  if (grant.isRefetchError)
    return (
      <div className="space-y-5">
        <Link className="text-sm text-primary" href="/app">
          <span aria-hidden>←</span> {t("detail.back")}
        </Link>
        <Notice title={t("detail.stale.title")} error>
          <p>{t("detail.stale.body")}</p>
          <p className="mt-2 break-words">
            {errorMessage(grant.error, {
              fallback: t("ui.error.requestFailed"),
              rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
            })}
          </p>
          <div className="mt-3">
            <AddressDisplay address={address} full />
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void grant.refetch()}
          >
            {t("detail.retry")}
          </Button>
        </Notice>
      </div>
    );
  const g = grant.data;
  const revocationPreview = deriveRevocationPreview({
    totalAllocation: g.totalAllocation,
    claimedAmount: g.claimedAmount,
    earnedAmount: g.revoked ? g.revocationEarnedAmount : g.unlockedAmount,
  });
  const state = deriveGrantState({
    totalAllocation: g.totalAllocation,
    claimedAmount: g.claimedAmount,
    vaultBalance: g.balance,
    revoked: g.revoked,
  });
  const roles = resolveProtocolRoles(wallet.address, g);
  // Workspace metadata: which preset this grant started from. An unknown or
  // retired key simply shows nothing; the vault's own terms are authoritative.
  const template = templateLabel(grantContext.data?.grant.templateKey);
  const isBeneficiary = roles.isBeneficiary;
  const isReviewer = roles.isReviewer;
  const isIssuer = roles.isIssuer;
  const canWrite =
    wallet.isConnected &&
    wallet.chainId === 133 &&
    !tx.pending &&
    !grant.isRefetchError;
  const canRevoke = isIssuer && g.revocable && !g.revoked && canWrite;
  const showTime = g.strategy !== 1;
  const showMilestones = g.strategy !== 0;
  const amount = (value: bigint) =>
    `${tokenAmount(value, g.decimals)} ${g.symbol}`;
  /** The Terms row is a value, not an address, so it is resolved up front. */
  const termsValue = g.revocable
    ? g.revoked
      ? t("detail.terms.revocableRevoked")
      : t("detail.terms.revocable")
    : t("detail.terms.nonRevocable");

  let claimReason = t("detail.claimReason.connect");
  if (isBeneficiary) {
    if (g.revoked && g.claimableAmount === 0n)
      claimReason = t("detail.claimReason.revokedAllClaimed");
    else if (g.revoked) claimReason = t("detail.claimReason.revokedClaimable");
    else if (g.eligibility.error)
      claimReason = t("detail.claimReason.providerError");
    else if (!g.eligibility.eligible)
      claimReason = t("detail.claimReason.notEligible");
    else if (state.lifecycle === "COMPLETED")
      claimReason = t("detail.claimReason.completed");
    else if (
      g.claimableAmount === 0n &&
      showMilestones &&
      g.milestoneUnlockedAmount === 0n
    )
      claimReason = t("detail.claimReason.awaitingMilestone");
    else if (g.claimableAmount === 0n && showTime && g.vestedByTime === 0n)
      claimReason = t("detail.claimReason.awaitingCliff");
    else if (g.claimableAmount === 0n)
      claimReason = t("detail.claimReason.allClaimed");
    else claimReason = t("detail.claimReason.ready");
  }

  async function handleRevoke() {
    await tx.run(async () => {
      if (!client) throw new Error(t("tx.error.rpcUnavailable", NETWORK));
      const account = assertTestnetWallet(g.issuer, walletMessages);
      await client.simulateContract({
        address,
        abi: grantVaultAbi,
        functionName: "revoke",
        account,
      });
      await tx.confirm(t("detail.revoke.tx"), () =>
        writeContractAsync({
          address,
          abi: grantVaultAbi,
          functionName: "revoke",
          chainId: 133,
          account: assertTestnetWallet(g.issuer, walletMessages),
        }),
      );
      setShowRevokeModal(false);
    });
  }

  async function claim() {
    await tx.run(async () => {
      if (!client) throw new Error(t("detail.rpcUnavailable", NETWORK));
      const account = assertTestnetWallet(g.beneficiary, walletMessages);
      await client.simulateContract({
        address,
        abi: grantVaultAbi,
        functionName: "claim",
        account,
      });
      await tx.confirm(t("detail.tx.claim"), () =>
        writeContractAsync({
          address,
          abi: grantVaultAbi,
          functionName: "claim",
          chainId: 133,
          account: assertTestnetWallet(g.beneficiary, walletMessages),
        }),
      );
    });
  }

  async function approve(index: number) {
    await tx.run(async () => {
      if (!client) throw new Error(t("detail.rpcUnavailable", NETWORK));
      const account = assertTestnetWallet(g.reviewer, walletMessages);
      await client.simulateContract({
        address,
        abi: grantVaultAbi,
        functionName: "approveMilestone",
        args: [BigInt(index)],
        account,
      });
      await tx.confirm(
        t("detail.tx.approveMilestone", { index: index + 1 }),
        () =>
          writeContractAsync({
            address,
            abi: grantVaultAbi,
            functionName: "approveMilestone",
            args: [BigInt(index)],
            chainId: 133,
            account: assertTestnetWallet(g.reviewer, walletMessages),
          }),
      );
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <Link className="text-primary" href="/app">
          <span aria-hidden>←</span> {t("detail.back")}
        </Link>
        {grantContext.data && (
          <>
            <span className="text-muted-foreground">/</span>
            <Link
              className="text-primary hover:underline"
              href={`/app/organizations/${grantContext.data.organization.id}`}
            >
              {grantContext.data.organization.name}
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{g.title}</span>
          </>
        )}
      </div>
      <PageHeading
        eyebrow={t("detail.eyebrow", NETWORK)}
        title={g.title}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <GrantLifecycleBadge lifecycle={state.lifecycle} />
            <span className="border border-primary/20 bg-[rgba(87,217,139,.05)] px-3 py-2 font-mono text-xs text-primary">
              {t(strategyKey(g.strategy, "name"))}
            </span>
            <span className="border border-primary/20 bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">
              {g.revocable
                ? t("detail.badge.revocable")
                : t("detail.badge.nonRevocable")}
            </span>
            {canRevoke && (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setShowRevokeModal(true)}
              >
                {t("detail.revoke.action")}
              </Button>
            )}
          </div>
        }
      >
        <AddressDisplay address={address} full />
        {grantContext.data?.grant.description && (
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            {grantContext.data.grant.description}
          </p>
        )}
        {template && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("detail.fromTemplate", {
              template,
            })}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {roles.roles.map((role) => (
            <span
              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"
              key={String(role)}
            >
              {t(`detail.youAre.${role}`)}
            </span>
          ))}
        </div>
      </PageHeading>
      <NetworkNotice />
      {g.revoked && (
        <Notice
          title={t("detail.revoked.title", { date: dateLabel(g.revokedAt) })}
        >
          <p>
            {t("detail.revoked.body.before")}
            <strong>{amount(revocationPreview.earnedAmount)}</strong>
            {t("detail.revoked.body.middle", {
              recovered: amount(revocationPreview.recoveredAmount),
            })}
            {g.claimableAmount > 0n
              ? t("detail.revoked.body.claimable", {
                  amount: amount(g.claimableAmount),
                })
              : t("detail.revoked.body.allClaimed")}
          </p>
        </Notice>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["totalAllocated", g.totalAllocation],
          ["unlocked", g.unlockedAmount],
          ["claimable", g.claimableAmount],
          ["claimed", g.claimedAmount],
        ].map(([field, value]) => (
          <Card key={String(field)}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">
                {t(
                  `detail.stat.${field as "totalAllocated" | "unlocked" | "claimable" | "claimed"}`,
                )}
              </p>
              <p className="mt-3 break-all font-mono text-[28px] font-medium tracking-tight tabular-nums">
                {typeof value === "bigint"
                  ? tokenAmount(value, g.decimals)
                  : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{g.symbol}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <FundingHealthSummary
        funding={state.funding}
        totalAllocation={g.totalAllocation}
        vaultBalance={g.balance}
        decimals={g.decimals}
        symbol={g.symbol}
      />
      <div className="grid items-start gap-3 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          {showTime && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[18px]">
                  {t("detail.schedule.title")}
                </CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("detail.schedule.lede")}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {t("detail.schedule.vestedByTime", {
                      amount: amount(g.vestedByTime),
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {percent(g.vestedByTime, g.totalAllocation)}%
                  </span>
                </div>
                <Progress
                  value={percent(g.vestedByTime, g.totalAllocation)}
                  label={t("detail.schedule.progressLabel")}
                />
                <dl className="grid gap-5 text-sm sm:grid-cols-3">
                  {[
                    ["start", g.start],
                    ["cliffReached", g.start + g.cliff],
                    ["fullyVested", g.start + g.duration],
                  ].map(([field, value]) => (
                    <div key={String(field)}>
                      <dt className="mb-2 text-xs text-muted-foreground">
                        {t(
                          `detail.schedule.${field as "start" | "cliffReached" | "fullyVested"}`,
                        )}
                      </dt>
                      <dd className="text-sm font-medium">
                        {typeof value === "bigint" ? dateLabel(value) : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
                {g.strategy === 2 && (
                  <div className="rounded-card border border-border-soft bg-secondary/70 p-4 text-sm leading-6">
                    <p className="font-medium">{t("detail.hybrid.formula")}</p>
                    <p className="mt-2 text-muted-foreground">
                      {t("detail.hybrid.timeVested", {
                        amount: amount(g.vestedByTime),
                      })}
                      <br />
                      {t("detail.hybrid.milestonesApproved", {
                        amount: amount(g.milestoneUnlockedAmount),
                      })}
                      <br />
                      <strong className="font-semibold text-primary">
                        {t("detail.hybrid.unlocked", {
                          amount: amount(g.unlockedAmount),
                        })}
                      </strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {showMilestones && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[18px]">
                  {t("detail.milestones.title")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("detail.milestones.summary", {
                    approved: g.milestones.filter((item) => item.approved)
                      .length,
                    total: g.milestones.length,
                    amount: amount(g.milestoneUnlockedAmount),
                  })}
                </p>
              </CardHeader>
              <CardContent>
                <ol className="divide-y">
                  {g.milestones.map((milestone, index) => (
                    <li
                      key={index}
                      className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 gap-3">
                        <span
                          className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs ${milestone.approved ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-muted-foreground"}`}
                        >
                          {milestone.approved ? "✓" : index + 1}
                        </span>
                        <div>
                          <p className="break-words font-medium">
                            {milestone.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {amount(milestone.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-medium ${milestone.approved ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {milestone.approved
                            ? t("detail.milestone.approved")
                            : t("detail.milestone.pending")}
                        </span>
                        {isReviewer &&
                          !milestone.approved &&
                          (g.revoked ? (
                            <span className="text-xs text-muted-foreground">
                              {t("detail.milestone.lockedByRevocation")}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canWrite}
                              onClick={() => void approve(index)}
                            >
                              {t("detail.milestone.approveAction")}
                            </Button>
                          ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("detail.terms.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <p className="leading-7 text-muted-foreground">
                {t(strategyKey(g.strategy, "description"))}{" "}
                {g.revocable
                  ? g.revoked
                    ? t("detail.terms.revokedNote", {
                        date: dateLabel(g.revokedAt),
                      })
                    : t("detail.terms.revocableNote")
                  : t("detail.terms.fixed")}
              </p>
              <dl className="space-y-4">
                {[
                  ["terms", termsValue],
                  ["issuer", g.issuer],
                  ["beneficiary", g.beneficiary],
                  ...(g.reviewer !== zeroAddress
                    ? [["reviewer", g.reviewer]]
                    : []),
                  ["token", g.token],
                ].map(([field, party]) => (
                  <div
                    key={field}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <dt className="text-muted-foreground">
                      {t(
                        `party.${field as "issuer" | "beneficiary" | "reviewer" | "token"}`,
                      )}
                    </dt>
                    <dd>
                      {field === "terms" ? (
                        <span className="font-medium text-foreground">
                          {party}
                        </span>
                      ) : field === "token" ? (
                        <AddressDisplay address={getAddress(party)} />
                      ) : (
                        <ParticipantIdentity
                          address={getAddress(party)}
                          members={organizationMembers.data}
                        />
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-3 lg:col-span-4">
          <Card className="border-primary/25 bg-[rgba(87,217,139,.04)]">
            <CardHeader>
              <CardTitle className="text-[18px]">
                {t("detail.claim.title")}
              </CardTitle>
              <p className="pt-3 font-mono text-[28px] font-medium text-primary tabular-nums">
                {tokenAmount(g.claimableAmount, g.decimals)}{" "}
                <span className="text-base font-normal">{g.symbol}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">
                {claimReason}
              </p>
              {isBeneficiary && (
                <Button
                  className="h-auto min-h-11 w-full whitespace-normal break-all py-3"
                  disabled={
                    !canWrite ||
                    g.claimableAmount === 0n ||
                    !g.eligibility.eligible ||
                    g.eligibility.error
                  }
                  onClick={() => void claim()}
                >
                  {tx.pending
                    ? t("detail.claim.pending")
                    : t("detail.claim.action", {
                        amount: amount(g.claimableAmount),
                      })}
                </Button>
              )}
              <div className="space-y-2 border-t pt-4 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("detail.claim.beneficiaryBalance")}
                  </span>
                  <span className="break-all text-right">
                    {amount(g.beneficiaryBalance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("detail.eligibility.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!g.eligibility.enabled ? (
                <p className="text-muted-foreground">
                  {t("detail.eligibility.none")}
                </p>
              ) : (
                <>
                  <p
                    className={`font-medium ${g.eligibility.eligible ? "text-primary" : "text-destructive"}`}
                  >
                    {g.eligibility.error
                      ? t("detail.eligibility.unavailable")
                      : g.eligibility.eligible
                        ? t("detail.eligibility.eligible")
                        : t("detail.eligibility.notEligible")}
                  </p>
                  <AddressDisplay address={g.eligibilityProvider} />
                  <p className="text-xs leading-6 text-muted-foreground">
                    {t("detail.eligibility.note")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <TransactionStatus {...tx} />
          <p className="text-xs leading-6 text-muted-foreground">
            {t("detail.footer.block", { block: g.blockNumber.toString() })}
            <br />
            {t("detail.footer.refresh", { seconds: REFRESH_SECONDS })}
          </p>
        </aside>
      </div>
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg border-[#E9832D]/40">
            <CardHeader>
              <CardTitle className="text-xl text-destructive">
                {t("detail.revoke.modal.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("detail.revoke.modal.lede")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y rounded-card border border-border text-sm">
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">
                    {t("detail.revoke.modal.totalAllocation")}
                  </span>
                  <span className="font-semibold">
                    {amount(g.totalAllocation)}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">
                    {t("detail.revoke.modal.alreadyClaimed")}
                  </span>
                  <span className="font-semibold">
                    {amount(g.claimedAmount)}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">
                    {t("detail.revoke.modal.earnedEntitlement")}
                  </span>
                  <span className="font-semibold text-primary">
                    {amount(revocationPreview.earnedAmount)}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">
                    {t("detail.revoke.modal.earnedUnclaimed")}
                  </span>
                  <span className="font-semibold">
                    {amount(revocationPreview.earnedUnclaimedAmount)}
                  </span>
                </div>
                <div className="flex justify-between bg-secondary/50 p-3">
                  <span className="font-medium">
                    {t("detail.revoke.modal.clawback")}
                  </span>
                  <span className="font-bold text-destructive">
                    {amount(revocationPreview.recoveredAmount)}
                  </span>
                </div>
              </div>
              <div className="rounded-card border border-[#E9832D]/30 bg-[rgba(233,131,45,.08)] p-3 text-xs leading-5 text-[#E9832D]">
                <strong>{t("detail.revoke.modal.warningLabel")}</strong>{" "}
                {t("detail.revoke.modal.warningBody", {
                  recovered: amount(revocationPreview.recoveredAmount),
                })}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  disabled={tx.pending}
                  onClick={() => setShowRevokeModal(false)}
                >
                  {t("detail.revoke.modal.cancel")}
                </Button>
                <Button
                  variant="default"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={!canWrite || tx.pending}
                  onClick={() => void handleRevoke()}
                >
                  {tx.pending
                    ? t("detail.revoke.modal.pending")
                    : t("detail.revoke.modal.confirm")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
