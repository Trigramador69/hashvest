"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAccount,
  usePublicClient,
  useSignTypedData,
  useWriteContract,
} from "wagmi";
import {
  getAddress,
  isAddress,
  zeroAddress,
  type Address,
  type Hash,
} from "viem";
import {
  grantVaultAbi,
  hskTestnet,
  SPONSORED_CLAIM_DOMAIN,
  SPONSORED_CLAIM_TYPES,
  transactionExplorerUrl,
} from "@hashvest/web3";
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
  useOrganizationSponsorshipPolicy,
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
import { appRoutes } from "@/lib/shared/routes";
import { deriveGrantState } from "@/lib/protocol/grant-state";
import { deriveRevocationPreview } from "@/lib/protocol/revocation";
import { ParticipantIdentity } from "./grant-card";
import { resolveProtocolRoles } from "@/lib/protocol/roles";
import { useGrantPresets } from "@/lib/shared/grant-presets/use-grant-presets";
import { organizationApi } from "@/lib/cloud/organizations/client";
import type { SponsoredClaimRequest } from "@/lib/cloud/organizations/types";
import { SPONSORED_CLAIM_SIGNING_WINDOW_SECONDS } from "@/lib/shared/sponsored-claims";

/** Protocol literals: never translated, only interpolated into messages. */
const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };
/** Matches the refetch interval in useGrant. */
const REFRESH_SECONDS = 7;

type SponsoredGrant = {
  claimableAmount: bigint;
  claimedAmount: bigint;
  beneficiary: Address;
  decimals: number;
  symbol: string;
  eligibility: { eligible: boolean; error: boolean };
  sponsoredClaim: {
    supported: boolean;
    nonce: bigint;
    used: boolean;
  };
};

type SignedSponsoredClaimInput = {
  amount: string;
  nonce: string;
  deadline: string;
  relayerAddress: string;
  signature: string;
};

function sponsoredRequestStatusLabel(
  request: SponsoredClaimRequest,
  t: ReturnType<typeof useTranslations>,
) {
  switch (request.status) {
    case "requested":
      return t("detail.sponsor.status.requested");
    case "processing":
      return t("detail.sponsor.status.processing");
    case "submitted":
      return t("detail.sponsor.status.submitted");
    case "confirmed":
      return t("detail.sponsor.status.confirmed");
    case "failed":
      return t("detail.sponsor.status.failed");
  }
}

function SponsoredClaimPanel({
  address,
  organizationId,
  grant,
  canWrite,
}: {
  address: Address;
  organizationId: string;
  grant: SponsoredGrant;
  canWrite: boolean;
}) {
  const t = useTranslations();
  const wallet = useAccount();
  const policy = useOrganizationSponsorshipPolicy(organizationId);
  const queryClient = useQueryClient();
  const { signTypedDataAsync } = useSignTypedData();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<SponsoredClaimRequest | null>(null);
  const [signedInput, setSignedInput] =
    useState<SignedSponsoredClaimInput | null>(null);
  const [error, setError] = useState("");

  const relayerAddress =
    policy.data?.relayerAddress && isAddress(policy.data.relayerAddress)
      ? getAddress(policy.data.relayerAddress)
      : undefined;

  useEffect(() => {
    let cancelled = false;
    void organizationApi
      .getSponsoredClaimByNonce(
        organizationId,
        address,
        grant.sponsoredClaim.nonce.toString(),
      )
      .then(({ request: existing }) => {
        if (!cancelled && existing) setRequest(existing);
      })
      .catch(() => {
        if (!cancelled) setError(t("detail.sponsor.statusUnavailable"));
      });
    return () => {
      cancelled = true;
    };
  }, [address, grant.sponsoredClaim.nonce, organizationId, t]);

  useEffect(() => {
    if (
      !request ||
      request.status === "confirmed" ||
      request.status === "failed"
    )
      return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const { request: updated } =
          await organizationApi.getSponsoredClaimStatus(
            organizationId,
            address,
            request.id,
          );
        if (cancelled) return;
        setRequest(updated);
        setError("");
        if (updated.status === "confirmed")
          void queryClient.invalidateQueries({
            queryKey: ["grant", 133, address],
          });
        else timer = setTimeout(poll, 2000);
      } catch {
        if (cancelled) return;
        setError(t("detail.sponsor.statusUnavailable"));
        timer = setTimeout(poll, 4000);
      }
    };
    timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [address, organizationId, queryClient, request, t]);

  const sponsorshipReady =
    grant.sponsoredClaim.supported &&
    !grant.sponsoredClaim.used &&
    grant.claimedAmount === 0n &&
    grant.claimableAmount > 0n &&
    grant.eligibility.eligible &&
    !grant.eligibility.error &&
    policy.data?.enabled === true &&
    (policy.data.remainingClaims ?? 0) > 0 &&
    relayerAddress !== undefined &&
    canWrite &&
    request === null;
  const retryReady =
    request?.status === "failed" && !request.txHash && signedInput !== null;

  let availability = t("detail.sponsor.unavailable");
  if (!grant.sponsoredClaim.supported)
    availability = t("detail.sponsor.legacy");
  else if (grant.sponsoredClaim.used || grant.claimedAmount !== 0n)
    availability = t("detail.sponsor.firstClaimOnly");
  else if (grant.claimableAmount === 0n)
    availability = t("detail.sponsor.noClaimable");
  else if (policy.isPending) availability = t("detail.sponsor.checking");
  else if (policy.isError || !policy.data)
    availability = t("detail.sponsor.unavailable");
  else if (!policy.data.enabled)
    availability = t("detail.sponsor.policyDisabled");
  else if (policy.data.remainingClaims <= 0)
    availability = t("detail.sponsor.limitReached");
  else if (!relayerAddress || !policy.data.relayerConfigured)
    availability = t("detail.sponsor.relayerMissing");

  async function submit(input: SignedSponsoredClaimInput) {
    if (BigInt(input.deadline) <= BigInt(Math.floor(Date.now() / 1000))) {
      setError(t("detail.sponsor.expired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await organizationApi.submitSponsoredClaim(
        organizationId,
        address,
        input,
      );
      setRequest(result.request);
      if (result.request.status === "confirmed")
        void queryClient.invalidateQueries({
          queryKey: ["grant", 133, address],
        });
    } catch {
      setError(t("detail.sponsor.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function sponsorClaim() {
    if (!wallet.address || !relayerAddress) return;
    setConfirming(false);
    setSubmitting(true);
    setError("");
    try {
      const deadline = BigInt(
        Math.floor(Date.now() / 1000) + SPONSORED_CLAIM_SIGNING_WINDOW_SECONDS,
      );
      const signature = await signTypedDataAsync({
        account: wallet.address,
        domain: {
          ...SPONSORED_CLAIM_DOMAIN,
          chainId: 133,
          verifyingContract: address,
        },
        types: SPONSORED_CLAIM_TYPES,
        primaryType: "SponsoredClaim",
        message: {
          vault: address,
          beneficiary: grant.beneficiary,
          amount: grant.claimableAmount,
          nonce: grant.sponsoredClaim.nonce,
          deadline,
          relayer: relayerAddress,
        },
      });
      const input = {
        amount: grant.claimableAmount.toString(),
        nonce: grant.sponsoredClaim.nonce.toString(),
        deadline: deadline.toString(),
        relayerAddress: relayerAddress as string,
        signature,
      };
      setSignedInput(input);
      const result = await organizationApi.submitSponsoredClaim(
        organizationId,
        address,
        input,
      );
      setRequest(result.request);
      if (result.request.status === "confirmed")
        void queryClient.invalidateQueries({
          queryKey: ["grant", 133, address],
        });
    } catch {
      setError(t("detail.sponsor.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 rounded-card border border-primary/25 bg-[rgba(87,217,139,.04)] p-4">
      <div>
        <h3 className="font-medium">{t("detail.sponsor.title")}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t("detail.sponsor.lede")}
        </p>
      </div>
      {request && (
        <div
          aria-live="polite"
          className="space-y-3 rounded-card border border-border bg-surface-1 p-3 text-xs"
        >
          <p className="font-medium">
            {sponsoredRequestStatusLabel(request, t)}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {t("detail.sponsor.gasPayer")}
            </span>
            <AddressDisplay address={request.relayerAddress as Address} />
          </div>
          {request.txHash && (
            <a
              className="block text-primary underline underline-offset-4"
              href={transactionExplorerUrl(request.txHash as Hash)}
              target="_blank"
              rel="noreferrer"
            >
              {t("detail.sponsor.transaction")} · {request.txHash.slice(0, 10)}…
              ↗
            </a>
          )}
          {request.status === "failed" && (
            <p className="text-destructive">
              {t("detail.sponsor.failedFallback")}
            </p>
          )}
        </div>
      )}
      {!request && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            {availability}
          </p>
          {confirming ? (
            <div
              aria-labelledby="sponsored-claim-confirm-title"
              className="space-y-3 rounded-card border border-primary/30 bg-surface-1 p-3"
              role="dialog"
            >
              <h4 className="font-medium" id="sponsored-claim-confirm-title">
                {t("detail.sponsor.confirmTitle")}
              </h4>
              <p className="text-xs leading-5 text-muted-foreground">
                {t("detail.sponsor.confirmBody", {
                  amount: `${tokenAmount(grant.claimableAmount, grant.decimals)} ${grant.symbol}`,
                })}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {t("detail.sponsor.gasPayer")}
                </span>
                <AddressDisplay address={relayerAddress as Address} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-auto min-h-10 whitespace-normal py-2"
                  disabled={!sponsorshipReady || submitting}
                  onClick={() => void sponsorClaim()}
                >
                  {submitting
                    ? t("detail.sponsor.signing")
                    : t("detail.sponsor.confirm")}
                </Button>
                <Button
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setConfirming(false)}
                >
                  {t("detail.sponsor.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="h-auto min-h-10 w-full whitespace-normal py-2"
              disabled={!sponsorshipReady}
              onClick={() => setConfirming(true)}
            >
              {t("detail.sponsor.action")}
            </Button>
          )}
        </>
      )}
      {retryReady && signedInput && (
        <Button
          className="h-auto min-h-10 w-full whitespace-normal py-2"
          variant="outline"
          disabled={submitting}
          onClick={() => void submit(signedInput)}
        >
          {submitting
            ? t("detail.sponsor.submitting")
            : t("detail.sponsor.retry")}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs leading-5 text-muted-foreground">
        {t("detail.sponsor.manualFallback")}
      </p>
    </section>
  );
}

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
        <Link className="text-sm text-primary" href={appRoutes.grants}>
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
        <Link className="text-sm text-primary" href={appRoutes.grants}>
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
        <Link className="text-primary" href={appRoutes.grants}>
          <span aria-hidden>←</span> {t("detail.back")}
        </Link>
        {grantContext.data && (
          <>
            <span className="text-muted-foreground">/</span>
            <Link
              className="text-primary hover:underline"
              href={appRoutes.organization(grantContext.data.organization.id)}
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
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
              key={String(role)}
            >
              <span className="size-1.5 rounded-full bg-current" />
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
              {isBeneficiary && grantContext.data?.organization.id && (
                <SponsoredClaimPanel
                  address={address}
                  organizationId={grantContext.data.organization.id}
                  grant={g}
                  canWrite={canWrite}
                />
              )}
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
