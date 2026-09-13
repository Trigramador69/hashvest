"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  erc20Abi,
  formatUnits,
  getAddress,
  isAddress,
  parseEventLogs,
  zeroAddress,
  type Address,
} from "viem";
import {
  hashVestFactoryAbi,
  hskTestnet,
  testnetDeployment,
} from "@hashvest/web3";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddressDisplay,
  Notice,
  TransactionStatus,
} from "@/components/grant-ui";
import { MemberPicker } from "@/components/organization-ui";
import { useToken } from "@/hooks/use-grant";
import {
  useLinkOrganizationGrant,
  useOrganization,
  useOrganizationMembers,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import {
  assertTestnetWallet,
  getWalletGuardMessages,
  useTransaction,
} from "@/hooks/use-transaction";
import {
  errorMessage,
  normalizeAddress,
  validParty,
} from "@/lib/protocol/grants";
import {
  type CohortExecutionItem,
  type CohortMemberInput,
  type CohortSharedConfig,
  MIN_COHORT_SIZE,
  MAX_COHORT_SIZE,
} from "@/lib/cloud/cohorts/types";
import {
  validateCohort,
  filterPendingCohortItems,
} from "@/lib/cloud/cohorts/validation";
import { useTranslations } from "@/lib/shared/i18n/provider";

const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

export type CohortCreatorProps = {
  organizationId?: string;
  onSwitchToSingle?: () => void;
};

export function CohortCreator({
  organizationId,
  onSwitchToSingle,
}: CohortCreatorProps) {
  const t = useTranslations();
  const walletMessages = getWalletGuardMessages(t);
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 133 });
  const { writeContractAsync } = useWriteContract();
  const tx = useTransaction();
  const session = useSession();
  const organization = useOrganization(organizationId);
  const organizationMembers = useOrganizationMembers(organizationId);
  const linkGrant = useLinkOrganizationGrant(organizationId ?? "direct");

  // Shared configuration
  const [titlePrefix, setTitlePrefix] = useState("");
  const [token, setToken] = useState<string>(testnetDeployment.demoToken ?? "");
  const [strategy, setStrategy] = useState<0 | 1 | 2>(0);
  const [start, setStart] = useState("");
  const [cliff, setCliff] = useState("0");
  const [duration, setDuration] = useState("5");
  const [unit, setUnit] = useState("60");
  const [reviewer, setReviewer] = useState("");
  const [reviewerMemberId, setReviewerMemberId] = useState("");
  const [reviewerExternal, setReviewerExternal] = useState(!organizationId);
  const [revocable, setRevocable] = useState(false);
  const [provider, setProvider] = useState("");

  // Cohort members input
  const [members, setMembers] = useState<CohortMemberInput[]>([
    {
      id: "member-1",
      beneficiary: "",
      memberId: "",
      external: !organizationId,
      allocation: "",
    },
    {
      id: "member-2",
      beneficiary: "",
      memberId: "",
      external: !organizationId,
      allocation: "",
    },
  ]);

  // Execution state
  const [executionItems, setExecutionItems] = useState<CohortExecutionItem[]>(
    [],
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [validationError, setValidationError] = useState("");

  const tokenMetadata = useToken(normalizeAddress(token));
  const factory = testnetDeployment.factory;
  const canWrite = Boolean(
    address &&
    chainId === 133 &&
    factory &&
    (!organizationId ||
      (session.walletMatches && organization.data?.membership.isOwner)),
  );

  function addMember() {
    if (members.length >= MAX_COHORT_SIZE) return;
    setMembers((prev) => [
      ...prev,
      {
        id: `member-${Date.now()}-${prev.length + 1}`,
        beneficiary: "",
        memberId: "",
        external: !organizationId,
        allocation: "",
      },
    ]);
  }

  function removeMember(index: number) {
    if (members.length <= MIN_COHORT_SIZE) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMember(index: number, patch: Partial<CohortMemberInput>) {
    setMembers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function buildSharedConfig(): CohortSharedConfig {
    let startTimestamp = 0n;
    let cliffSeconds = 0n;
    let durationSeconds = 0n;

    if (strategy !== 1) {
      if (!/^\d+$/.test(duration) || BigInt(duration) === 0n) {
        throw new Error(t("wizard.error.duration"));
      }
      if (!/^\d+$/.test(cliff)) {
        throw new Error(t("wizard.error.cliff"));
      }
      durationSeconds = BigInt(duration) * BigInt(unit);
      cliffSeconds = BigInt(cliff) * BigInt(unit);
      if (cliffSeconds > durationSeconds) {
        throw new Error(t("wizard.error.cliffTooLong"));
      }
      if (start) {
        const parsed = new Date(start).getTime();
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(t("wizard.error.startDate"));
        }
        startTimestamp = BigInt(Math.floor(parsed / 1000));
      }
    }

    if (strategy !== 0) {
      if (!validParty(reviewer)) {
        throw new Error(t("wizard.error.reviewerRequired"));
      }
    }

    if (provider && !validParty(provider)) {
      throw new Error(t("wizard.error.eligibility"));
    }

    return {
      titlePrefix: titlePrefix.trim() || "Grant",
      token: getAddress(token),
      reviewer: strategy === 0 ? zeroAddress : getAddress(reviewer),
      strategy,
      start: startTimestamp,
      cliff: cliffSeconds,
      duration: durationSeconds,
      eligibilityProvider: provider ? getAddress(provider) : zeroAddress,
      revocable,
    };
  }

  async function executeCohort(retryOnly = false) {
    setValidationError("");
    if (!address || !client || !factory || !tokenMetadata.data) {
      setValidationError(t("wizard.error.issuerWallet"));
      return;
    }

    try {
      if (!titlePrefix.trim()) {
        throw new Error(t("wizard.error.title"));
      }
      if (!validParty(token)) {
        throw new Error(t("wizard.error.token"));
      }

      const shared = buildSharedConfig();
      const account = assertTestnetWallet(address, walletMessages);

      const balance = await client.readContract({
        address: shared.token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account],
      });

      const validated = validateCohort({
        shared,
        members,
        decimals: tokenMetadata.data.decimals,
        issuerBalance: balance,
      });

      let itemsToRun: CohortExecutionItem[];
      if (retryOnly && executionItems.length > 0) {
        itemsToRun = filterPendingCohortItems(executionItems);
      } else {
        itemsToRun = validated.members.map((m) => ({
          id: m.id,
          beneficiary: m.beneficiary,
          allocation: m.allocation,
          title: m.title,
          status: "idle",
        }));
        setExecutionItems(itemsToRun);
      }

      if (itemsToRun.length === 0) {
        return;
      }

      setIsExecuting(true);

      // Check cumulative allowance needed for remaining items
      const remainingAllocation = itemsToRun.reduce(
        (sum, item) => sum + item.allocation,
        0n,
      );

      const currentAllowance = await client.readContract({
        address: shared.token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, factory],
      });

      if (currentAllowance < remainingAllocation) {
        if (currentAllowance > 0n) {
          await tx.confirm(t("wizard.tx.resetAllowance"), () =>
            writeContractAsync({
              address: shared.token,
              abi: erc20Abi,
              functionName: "approve",
              args: [factory, 0n],
              chainId: 133,
              account: assertTestnetWallet(account, walletMessages),
              gas: 60_000n,
            }),
          );
        }

        await tx.confirm(
          `Approve total cohort tokens (${formatUnits(remainingAllocation, tokenMetadata.data.decimals)} ${tokenMetadata.data.symbol})`,
          () =>
            writeContractAsync({
              address: shared.token,
              abi: erc20Abi,
              functionName: "approve",
              args: [factory, remainingAllocation],
              chainId: 133,
              account: assertTestnetWallet(account, walletMessages),
              gas: 80_000n,
            }),
        );
      }

      // Execute each grant sequentially
      for (const item of itemsToRun) {
        setExecutionItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: "pending_signature" } : it,
          ),
        );

        const member = validated.members.find((row) => row.id === item.id);
        const grantConfig = {
          title: item.title,
          token: shared.token,
          beneficiary: item.beneficiary,
          reviewer: shared.reviewer,
          totalAllocation: item.allocation,
          strategy: shared.strategy,
          start: shared.start,
          cliff: shared.cliff,
          duration: shared.duration,
          eligibilityProvider: shared.eligibilityProvider,
          initialUnlock: member?.initialUnlock ?? 0n,
          revocable: shared.revocable,
        };

        const milestones =
          shared.strategy === 0 ? [] : (member?.milestones ?? []);

        try {
          const simulation = await client.simulateContract({
            address: factory,
            abi: hashVestFactoryAbi,
            functionName: "createGrant",
            args: [grantConfig, milestones],
            account,
          });

          const receipt = await tx.confirm(
            `Create Grant for ${item.beneficiary.slice(0, 6)}…${item.beneficiary.slice(-4)}`,
            () =>
              writeContractAsync({
                address: factory,
                abi: hashVestFactoryAbi,
                functionName: "createGrant",
                args: [grantConfig, milestones],
                chainId: 133,
                account: assertTestnetWallet(account, walletMessages),
                gas: simulation.request.gas
                  ? (simulation.request.gas * 130n) / 100n
                  : undefined,
              }),
          );

          const events = parseEventLogs({
            abi: hashVestFactoryAbi,
            eventName: "GrantCreated",
            logs: receipt.logs.filter(
              (log: { address: string }) =>
                log.address.toLowerCase() === factory.toLowerCase(),
            ),
          });

          const vaultAddress = events[0]?.args.vault ?? simulation.result;

          // Link to workspace if in organization context
          if (organizationId && vaultAddress) {
            try {
              await linkGrant.mutateAsync({
                chainId: 133,
                vaultAddress,
                description: `Cohort Grant: ${item.title}`,
                templateKey: null,
              });
            } catch {
              // Metadata linkage failure does not invalidate onchain vault
            }
          }

          setExecutionItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: "confirmed",
                    txHash: receipt.transactionHash,
                    vaultAddress,
                  }
                : it,
            ),
          );
        } catch (itemError) {
          const msg = errorMessage(itemError);
          setExecutionItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: "failed",
                    error: msg,
                  }
                : it,
            ),
          );
          // Stop sequential execution on error so user can review and retry
          break;
        }
      }
    } catch (err) {
      setValidationError(errorMessage(err));
    } finally {
      setIsExecuting(false);
    }
  }

  const confirmedCount = executionItems.filter(
    (i) => i.status === "confirmed",
  ).length;
  const failedCount = executionItems.filter(
    (i) => i.status === "failed",
  ).length;
  const hasStartedExecution = executionItems.length > 0;
  const allConfirmed =
    hasStartedExecution && confirmedCount === executionItems.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl">
            Cohort Distribution (Batch Grants)
          </CardTitle>
          {onSwitchToSingle && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSwitchToSingle}
              disabled={isExecuting}
            >
              Switch to Single Grant
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <Notice title="Bounded Cohort Orchestration">
            <p>
              Distribute grants to a bounded cohort (2 to 10 recipients) with
              exact per-item validation and safe sequential signing. Each grant
              deploys an independent onchain vault on HSK Testnet with its own
              transaction receipt.
            </p>
          </Notice>

          <fieldset
            className="space-y-6"
            disabled={isExecuting || allConfirmed}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Cohort Base Title</span>
                <input
                  className="field"
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value)}
                  placeholder="e.g. Core Contributors Q1"
                  maxLength={100}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Token Address</span>
                <input
                  className="field font-mono"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  placeholder="0x…"
                />
              </label>
            </div>

            {testnetDeployment.demoToken && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setToken(testnetDeployment.demoToken ?? "")}
              >
                Use Demo Token (hvUSD)
              </Button>
            )}

            {isAddress(token) && (
              <p className="text-xs text-muted-foreground">
                {tokenMetadata.isPending
                  ? t("wizard.token.reading", NETWORK)
                  : tokenMetadata.isError
                    ? t("wizard.token.error")
                    : t("wizard.token.decimals", {
                        symbol: tokenMetadata.data?.symbol ?? "",
                        decimals: tokenMetadata.data?.decimals ?? 0,
                      })}
              </p>
            )}

            <div className="space-y-3">
              <span className="text-sm font-medium">Vesting Strategy</span>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    id: 0,
                    name: "Time-based",
                    desc: "Linear stream with cliff",
                  },
                  {
                    id: 1,
                    name: "Milestone-based",
                    desc: "Reviewer approval releases",
                  },
                  {
                    id: 2,
                    name: "Hybrid",
                    desc: "Combined stream and milestone",
                  },
                ].map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer flex-col rounded-card border p-3 text-sm ${strategy === s.id ? "border-primary bg-primary/5" : "bg-card"}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cohort-strategy"
                        checked={strategy === s.id}
                        onChange={() => setStrategy(s.id as 0 | 1 | 2)}
                      />
                      <span className="font-semibold">{s.name}</span>
                    </div>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {s.desc}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {strategy !== 1 && (
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-xs font-medium">
                    Start Date & Time (optional, default: creation block)
                  </span>
                  <input
                    className="field"
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium">Time Unit</span>
                    <select
                      className="field"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <option value="60">Minutes</option>
                      <option value="3600">Hours</option>
                      <option value="86400">Days</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium">
                      Cliff (
                      {unit === "60" ? "min" : unit === "3600" ? "hrs" : "days"}
                      )
                    </span>
                    <input
                      className="field"
                      inputMode="numeric"
                      value={cliff}
                      onChange={(e) => setCliff(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium">
                      Duration (
                      {unit === "60" ? "min" : unit === "3600" ? "hrs" : "days"}
                      )
                    </span>
                    <input
                      className="field"
                      inputMode="numeric"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}

            {strategy !== 0 && (
              <div>
                {organizationId ? (
                  <MemberPicker
                    label="Reviewer Wallet"
                    hint="Reviewer wallet that verifies milestones"
                    choosePlaceholder="Choose reviewer member"
                    members={organizationMembers.data}
                    memberId={reviewerMemberId}
                    addressValue={reviewer}
                    onMemberChange={setReviewerMemberId}
                    onAddressChange={setReviewer}
                    external={reviewerExternal}
                    onExternalChange={setReviewerExternal}
                  />
                ) : (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Reviewer Wallet</span>
                    <input
                      className="field font-mono"
                      value={reviewer}
                      onChange={(e) => setReviewer(e.target.value.trim())}
                      placeholder="0x…"
                    />
                  </label>
                )}
              </div>
            )}

            <details className="rounded-card border border-border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Advanced Options
              </summary>
              <div className="mt-4">
                <label className="block space-y-1">
                  <span className="text-xs font-medium">
                    Eligibility Provider Address (optional)
                  </span>
                  <input
                    className="field font-mono"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value.trim())}
                    placeholder="0x…"
                    spellCheck={false}
                  />
                </label>
              </div>
            </details>

            <div className="rounded-card border border-border p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-gray-300 text-primary"
                  checked={revocable}
                  onChange={(e) => setRevocable(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium">Revocable Grants</span>
                  <span className="block text-xs text-muted-foreground">
                    Allow issuer to revoke unvested tokens.
                  </span>
                </div>
              </label>
            </div>

            {/* Recipient Roster */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Cohort Beneficiaries ({members.length}/{MAX_COHORT_SIZE})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define 2 to 10 unique beneficiaries and exact token amounts.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={members.length >= MAX_COHORT_SIZE}
                  onClick={addMember}
                >
                  + Add Beneficiary
                </Button>
              </div>

              <div className="space-y-3">
                {members.map((member, idx) => (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-card border bg-card p-3"
                  >
                    <span className="inline-grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      {idx + 1}
                    </span>

                    <div className="flex-1 w-full sm:w-auto">
                      {organizationId ? (
                        <MemberPicker
                          label="Beneficiary"
                          hint="Select workspace member or enter external address"
                          choosePlaceholder="Select member or external"
                          members={organizationMembers.data}
                          memberId={member.memberId ?? ""}
                          addressValue={member.beneficiary}
                          onMemberChange={(mid) =>
                            updateMember(idx, { memberId: mid })
                          }
                          onAddressChange={(addr) =>
                            updateMember(idx, { beneficiary: addr })
                          }
                          external={member.external ?? !organizationId}
                          onExternalChange={(ext) =>
                            updateMember(idx, { external: ext })
                          }
                        />
                      ) : (
                        <input
                          className="field font-mono text-xs"
                          value={member.beneficiary}
                          onChange={(e) =>
                            updateMember(idx, {
                              beneficiary: e.target.value.trim(),
                            })
                          }
                          placeholder="Beneficiary 0x…"
                        />
                      )}
                    </div>

                    <div className="w-full sm:w-40">
                      <input
                        className="field text-sm"
                        inputMode="decimal"
                        value={member.allocation}
                        onChange={(e) =>
                          updateMember(idx, {
                            allocation: e.target.value.trim(),
                          })
                        }
                        placeholder={`Allocation (${tokenMetadata.data?.symbol ?? "tokens"})`}
                      />
                    </div>

                    {members.length > MIN_COHORT_SIZE && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => removeMember(idx)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </fieldset>

          {validationError && (
            <p role="alert" className="text-sm text-destructive font-medium">
              {validationError}
            </p>
          )}

          {/* Progress / Status Display */}
          {hasStartedExecution && (
            <div className="space-y-3 rounded-card border bg-secondary/20 p-4">
              <h4 className="text-sm font-semibold">
                Cohort Creation Progress ({confirmedCount}/
                {executionItems.length} Confirmed)
              </h4>
              <div className="space-y-2">
                {executionItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border bg-card p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{idx + 1}</span>
                      <span className="font-mono">
                        {item.beneficiary.slice(0, 8)}…
                        {item.beneficiary.slice(-6)}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        (
                        {formatUnits(
                          item.allocation,
                          tokenMetadata.data?.decimals ?? 18,
                        )}{" "}
                        {tokenMetadata.data?.symbol})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "confirmed" && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-primary font-medium">
                          ✓ Confirmed
                        </span>
                      )}
                      {item.status === "failed" && (
                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-destructive font-medium">
                          ✕ Failed
                        </span>
                      )}
                      {item.status === "pending_signature" && (
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-600 font-medium">
                          Awaiting Wallet Signature…
                        </span>
                      )}
                      {item.status === "simulating" && (
                        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-600 font-medium">
                          Simulating on HSK…
                        </span>
                      )}
                      {item.status === "idle" && (
                        <span className="text-muted-foreground">Queued</span>
                      )}

                      {item.vaultAddress && (
                        <Link
                          href={`/grants/${item.vaultAddress}`}
                          className="font-mono text-primary underline hover:opacity-80"
                        >
                          Vault ↗
                        </Link>
                      )}
                      {item.txHash && (
                        <AddressDisplay address={item.txHash as Address} />
                      )}
                    </div>

                    {item.error && (
                      <p className="w-full text-destructive text-[11px] mt-1">
                        {item.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            {!hasStartedExecution ? (
              <Button
                type="button"
                disabled={!canWrite || isExecuting}
                onClick={() => void executeCohort(false)}
              >
                {isExecuting ? "Creating Cohort…" : "Create Cohort Grants"}
              </Button>
            ) : allConfirmed ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary">
                  All {confirmedCount} cohort grants created successfully!
                </span>
                <Link className={buttonVariants()} href="/app">
                  Go to Overview →
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {failedCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={isExecuting}
                    onClick={() => void executeCohort(true)}
                  >
                    Retry Remaining ({executionItems.length - confirmedCount})
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={isExecuting}
                  onClick={() => {
                    setExecutionItems([]);
                    setValidationError("");
                  }}
                >
                  Reset / Reconfigure
                </Button>
              </div>
            )}
          </div>

          <TransactionStatus {...tx} />
        </CardContent>
      </Card>
    </div>
  );
}
