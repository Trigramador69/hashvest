"use client";

import Link from "next/link";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { getAddress, zeroAddress, type Address } from "viem";
import { grantVaultAbi } from "@hashvest/web3";
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
import { assertTestnetWallet, useTransaction } from "@/hooks/use-transaction";
import {
  dateLabel,
  errorMessage,
  percent,
  strategies,
  strategyDescriptions,
  tokenAmount,
} from "@/lib/protocol/grants";
import { deriveGrantState } from "@/lib/protocol/grant-state";
import { ParticipantIdentity } from "./grant-card";
import { resolveProtocolRoles } from "@/lib/protocol/roles";

export function GrantDetail({ address }: { address: Address }) {
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
      <Notice title="Loading grant">
        <p>Reading the vault and token on HSK Testnet…</p>
      </Notice>
    );
  if (!grant.data)
    return (
      <div className="space-y-5">
        <Link className="text-sm text-primary" href="/app">
          ← My grants
        </Link>
        <Notice title="Unable to read this grant" error>
          <p>
            Check that this is a HashVest GrantVault on HSK Testnet. The RPC may
            also be temporarily unavailable.
          </p>
          <p className="mt-2 break-words">{errorMessage(grant.error)}</p>
          <div className="mt-3">
            <AddressDisplay address={address} full />
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void grant.refetch()}
          >
            Retry
          </Button>
        </Notice>
      </div>
    );
  if (grant.isRefetchError)
    return (
      <div className="space-y-5">
        <Link className="text-sm text-primary" href="/app">
          ← My grants
        </Link>
        <Notice title="Live grant state is unavailable" error>
          <p>
            The last HSK read could not be refreshed, so current grant values
            are hidden until the live state is available again.
          </p>
          <p className="mt-2 break-words">{errorMessage(grant.error)}</p>
          <div className="mt-3">
            <AddressDisplay address={address} full />
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void grant.refetch()}
          >
            Retry
          </Button>
        </Notice>
      </div>
    );
  const g = grant.data;
  const state = deriveGrantState({
    totalAllocation: g.totalAllocation,
    claimedAmount: g.claimedAmount,
    vaultBalance: g.balance,
  });
  const roles = resolveProtocolRoles(wallet.address, g);
  const isBeneficiary = roles.isBeneficiary;
  const isReviewer = roles.isReviewer;
  const canWrite =
    wallet.isConnected &&
    wallet.chainId === 133 &&
    !tx.pending &&
    !grant.isRefetchError;
  const showTime = g.strategy !== 1;
  const showMilestones = g.strategy !== 0;
  const amount = (value: bigint) =>
    `${tokenAmount(value, g.decimals)} ${g.symbol}`;

  let claimReason = "Connect the beneficiary wallet to claim tokens.";
  if (isBeneficiary) {
    if (g.eligibility.error)
      claimReason =
        "The eligibility provider could not be read. Claims remain blocked until it is available.";
    else if (!g.eligibility.eligible)
      claimReason =
        "The configured provider has not marked the beneficiary eligible.";
    else if (state.lifecycle === "COMPLETED")
      claimReason = "The full allocation has been claimed.";
    else if (
      g.claimableAmount === 0n &&
      showMilestones &&
      g.milestoneUnlockedAmount === 0n
    )
      claimReason = "Waiting for the reviewer to approve a milestone.";
    else if (g.claimableAmount === 0n && showTime && g.vestedByTime === 0n)
      claimReason = "Tokens are waiting for the vesting start or cliff.";
    else if (g.claimableAmount === 0n)
      claimReason =
        "All currently unlocked tokens have been claimed. More time or milestone progress is needed.";
    else
      claimReason =
        "Claim the currently unlocked amount directly to your beneficiary wallet.";
  }

  async function claim() {
    await tx.run(async () => {
      if (!client) throw new Error("HSK Testnet RPC is unavailable.");
      const account = assertTestnetWallet(g.beneficiary);
      await client.simulateContract({
        address,
        abi: grantVaultAbi,
        functionName: "claim",
        account,
      });
      await tx.confirm("Claim tokens", () =>
        writeContractAsync({
          address,
          abi: grantVaultAbi,
          functionName: "claim",
          chainId: 133,
          account: assertTestnetWallet(g.beneficiary),
        }),
      );
    });
  }

  async function approve(index: number) {
    await tx.run(async () => {
      if (!client) throw new Error("HSK Testnet RPC is unavailable.");
      const account = assertTestnetWallet(g.reviewer);
      await client.simulateContract({
        address,
        abi: grantVaultAbi,
        functionName: "approveMilestone",
        args: [BigInt(index)],
        account,
      });
      await tx.confirm(`Approve milestone ${index + 1}`, () =>
        writeContractAsync({
          address,
          abi: grantVaultAbi,
          functionName: "approveMilestone",
          args: [BigInt(index)],
          chainId: 133,
          account: assertTestnetWallet(g.reviewer),
        }),
      );
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <Link className="text-primary" href="/app">
          ← My grants
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
        eyebrow="Grant vault · HSK Testnet"
        title={g.title}
        action={
          <div className="flex flex-wrap gap-2">
            <GrantLifecycleBadge lifecycle={state.lifecycle} />
            <span className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              {strategies[g.strategy]}
            </span>
          </div>
        }
      >
        <AddressDisplay address={address} full />
        {grantContext.data?.grant.description && (
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            {grantContext.data.grant.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {roles.roles.map((role) => (
            <span
              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"
              key={String(role)}
            >
              You are the {String(role).toLowerCase()}
            </span>
          ))}
        </div>
      </PageHeading>
      <NetworkNotice />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total allocated", g.totalAllocation],
          ["Unlocked", g.unlockedAmount],
          ["Claimable", g.claimableAmount],
          ["Claimed", g.claimedAmount],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">
                {String(label)}
              </p>
              <p className="mt-3 break-all text-2xl font-semibold tracking-tight">
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
      <div className="grid items-start gap-7 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-7">
          {showTime && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vesting schedule</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  Linear from the start. The cliff delays claiming without
                  restarting the curve.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {amount(g.vestedByTime)} vested by time
                  </span>
                  <span className="text-muted-foreground">
                    {percent(g.vestedByTime, g.totalAllocation)}%
                  </span>
                </div>
                <Progress
                  value={percent(g.vestedByTime, g.totalAllocation)}
                  label="Time vested"
                />
                <dl className="grid gap-5 text-sm sm:grid-cols-3">
                  {[
                    ["Start", g.start],
                    ["Cliff reached", g.start + g.cliff],
                    ["Fully vested", g.start + g.duration],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="mb-2 text-xs text-muted-foreground">
                        {String(label)}
                      </dt>
                      <dd className="text-sm font-medium">
                        {typeof value === "bigint" ? dateLabel(value) : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
                {g.initialUnlock > 0n && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
                    <p className="font-medium text-primary">
                      Initial unlock (TGE): {amount(g.initialUnlock)} (
                      {percent(g.initialUnlock, g.totalAllocation)}%)
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Available immediately at start. The remaining{" "}
                      {amount(g.totalAllocation - g.initialUnlock)} follows the
                      schedule below.
                    </p>
                  </div>
                )}
                {g.strategy === 2 && (
                  <div className="rounded-lg bg-secondary/70 p-4 text-sm leading-6">
                    <p className="font-medium">
                      {g.initialUnlock > 0n
                        ? "Hybrid = initial unlock + min(time vesting remaining, approved milestones)"
                        : "Hybrid = min(time vested, approved milestones)"}
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      {g.initialUnlock > 0n && (
                        <>
                          Initial unlock: {amount(g.initialUnlock)}
                          <br />
                        </>
                      )}
                      Time vested: {amount(g.vestedByTime)}
                      <br />
                      Milestones approved: {amount(g.milestoneUnlockedAmount)}
                      <br />
                      <strong className="font-semibold text-primary">
                        Unlocked: {amount(g.unlockedAmount)}
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
                <CardTitle className="text-lg">Milestones</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {g.milestones.filter((item) => item.approved).length} of{" "}
                  {g.milestones.length} approved ·{" "}
                  {amount(g.milestoneUnlockedAmount)}
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
                          className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs ${milestone.approved ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
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
                          {milestone.approved ? "Approved" : "Pending"}
                        </span>
                        {isReviewer && !milestone.approved && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canWrite}
                            onClick={() => void approve(index)}
                          >
                            Approve milestone
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grant terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <p className="leading-7 text-muted-foreground">
                {strategyDescriptions[g.strategy]} Terms and allocation are
                fixed. This grant cannot be revoked.
              </p>
              <dl className="space-y-4">
                {[
                  ["Issuer", g.issuer],
                  ["Beneficiary", g.beneficiary],
                  ...(g.reviewer !== zeroAddress
                    ? [["Reviewer", g.reviewer]]
                    : []),
                  ["Token", g.token],
                ].map(([label, party]) => (
                  <div
                    key={label}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>
                      {label === "Token" ? (
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
        <aside className="space-y-5">
          <Card className="border-primary/25">
            <CardHeader>
              <CardTitle className="text-lg">Ready to claim</CardTitle>
              <p className="pt-3 text-3xl font-semibold text-primary">
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
                    ? "Transaction in progress…"
                    : `Claim ${amount(g.claimableAmount)}`}
                </Button>
              )}
              <div className="space-y-2 border-t pt-4 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    Beneficiary token balance
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
              <CardTitle className="text-base">Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!g.eligibility.enabled ? (
                <p className="text-muted-foreground">
                  No provider configured. Claims do not require an eligibility
                  check.
                </p>
              ) : (
                <>
                  <p
                    className={`font-medium ${g.eligibility.eligible ? "text-primary" : "text-destructive"}`}
                  >
                    {g.eligibility.error
                      ? "Provider unavailable"
                      : g.eligibility.eligible
                        ? "Beneficiary is eligible"
                        : "Beneficiary is not eligible"}
                  </p>
                  <AddressDisplay address={g.eligibilityProvider} />
                  <p className="text-xs leading-6 text-muted-foreground">
                    The provider controls beneficiary eligibility. The demo
                    adapter is not real KYC or compliance.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <TransactionStatus {...tx} />
          <p className="text-xs leading-6 text-muted-foreground">
            Live contract reads · Block {g.blockNumber.toString()}
            <br />
            Refreshes every 7 seconds and after transactions.
          </p>
        </aside>
      </div>
    </div>
  );
}
