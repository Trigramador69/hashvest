"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
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
  grantVaultAbi,
  hashVestFactoryAbi,
  testnetDeployment,
} from "@hashvest/web3";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddressDisplay,
  NetworkNotice,
  Notice,
  PageHeading,
  TransactionStatus,
} from "@/components/grant-ui";
import { DemoFaucet } from "@/components/demo-faucet";
import { useToken } from "@/hooks/use-grant";
import { assertTestnetWallet, useTransaction } from "@/hooks/use-transaction";
import {
  dateLabel,
  errorMessage,
  normalizeAddress,
  parseAllocation,
  strategies,
  strategyDescriptions,
  validParty,
} from "@/lib/grants";

const steps = ["Grant", "Strategy", "Conditions", "Review"];
type MilestoneInput = { title: string; amount: string };
type GrantConfiguration = {
  title: string;
  token: Address;
  beneficiary: Address;
  reviewer: Address;
  totalAllocation: bigint;
  strategy: 0 | 1 | 2;
  start: bigint;
  cliff: bigint;
  duration: bigint;
  eligibilityProvider: Address;
};
type PreparedGrant = {
  config: GrantConfiguration;
  milestones: { title: string; amount: bigint }[];
  symbol: string;
  decimals: number;
  issuer: Address;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && (
        <span className="block text-xs leading-5 text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}

export default function NewGrant() {
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 133 });
  const { writeContractAsync } = useWriteContract();
  const tx = useTransaction();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [token, setToken] = useState<string>(testnetDeployment.demoToken ?? "");
  const [allocation, setAllocation] = useState("");
  const [strategy, setStrategy] = useState<0 | 1 | 2>(0);
  const [start, setStart] = useState("");
  const [cliff, setCliff] = useState("0");
  const [duration, setDuration] = useState("5");
  const [unit, setUnit] = useState("60");
  const [reviewer, setReviewer] = useState("");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: "", amount: "" },
  ]);
  const [provider, setProvider] = useState("");
  const [validationError, setValidationError] = useState("");
  const [prepared, setPrepared] = useState<PreparedGrant>();
  const [createdAddress, setCreatedAddress] = useState<Address>();
  const [creationConfirmed, setCreationConfirmed] = useState(false);
  const tokenMetadata = useToken(normalizeAddress(token));
  const factory = testnetDeployment.factory;
  const canWrite = Boolean(address && chainId === 133 && factory);

  function validateGrant() {
    if (!title.trim()) throw new Error("Give your grant a title.");
    if (!validParty(beneficiary))
      throw new Error("Enter a valid, nonzero beneficiary address.");
    if (!validParty(token))
      throw new Error(
        "Enter a valid ERC20 contract address. Native HSK is not supported.",
      );
    if (!tokenMetadata.data || tokenMetadata.isError)
      throw new Error(
        "Wait for the ERC20 symbol and decimals to load. Check that the token is deployed on HSK Testnet.",
      );
    return parseAllocation(allocation, tokenMetadata.data.decimals);
  }

  function prepare(): PreparedGrant {
    const totalAllocation = validateGrant();
    if (!tokenMetadata.data || !address)
      throw new Error("Connect the issuer wallet before reviewing.");
    let startTimestamp = 0n;
    let cliffSeconds = 0n;
    let durationSeconds = 0n;
    if (strategy !== 1) {
      if (!/^\d+$/.test(duration) || BigInt(duration) === 0n)
        throw new Error("Duration must be a positive whole number.");
      if (!/^\d+$/.test(cliff))
        throw new Error("Cliff must be a nonnegative whole number.");
      durationSeconds = BigInt(duration) * BigInt(unit);
      cliffSeconds = BigInt(cliff) * BigInt(unit);
      if (cliffSeconds > durationSeconds)
        throw new Error("Cliff cannot be longer than the total duration.");
      if (durationSeconds > BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error("Duration is too large.");
      if (start) {
        const parsed = new Date(start).getTime();
        if (!Number.isFinite(parsed) || parsed < 0)
          throw new Error("Enter a valid start date.");
        startTimestamp = BigInt(Math.floor(parsed / 1000));
      }
    }
    if (provider && !validParty(provider))
      throw new Error(
        "Enter a valid eligibility provider address or leave it empty.",
      );
    const items =
      strategy === 0
        ? []
        : milestones.map((item, index) => {
            if (!item.title.trim())
              throw new Error(`Milestone ${index + 1} needs a title.`);
            return {
              title: item.title.trim(),
              amount: parseAllocation(item.amount, tokenMetadata.data.decimals),
            };
          });
    if (strategy !== 0) {
      if (!validParty(reviewer))
        throw new Error(
          "Milestone and hybrid grants require a reviewer address.",
        );
      if (!items.length || items.length > 20)
        throw new Error("Add between 1 and 20 milestones.");
      if (
        items.reduce((sum, item) => sum + item.amount, 0n) !== totalAllocation
      )
        throw new Error(
          "Milestone amounts must add up exactly to the total allocation.",
        );
    }
    return {
      config: {
        title: title.trim(),
        token: getAddress(token),
        beneficiary: getAddress(beneficiary),
        reviewer: strategy === 0 ? zeroAddress : getAddress(reviewer),
        totalAllocation,
        strategy,
        start: startTimestamp,
        cliff: cliffSeconds,
        duration: durationSeconds,
        eligibilityProvider: provider ? getAddress(provider) : zeroAddress,
      },
      milestones: items,
      symbol: tokenMetadata.data.symbol,
      decimals: tokenMetadata.data.decimals,
      issuer: address,
    };
  }

  function next() {
    setValidationError("");
    try {
      if (step === 0) validateGrant();
      if (step === 2) setPrepared(prepare());
      setStep((current) => Math.min(current + 1, 3));
    } catch (error) {
      setValidationError(errorMessage(error));
    }
  }

  async function createGrant() {
    await tx.run(async () => {
      if (!prepared || !client || !factory)
        throw new Error(
          "Review the grant and check the Testnet deployment before continuing.",
        );
      const account = assertTestnetWallet(prepared.issuer);
      const { config, milestones: items } = prepared;
      const balance = await client.readContract({
        address: config.token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account],
      });
      if (balance < config.totalAllocation)
        throw new Error(
          `Insufficient ${prepared.symbol}. The full allocation must be funded at creation.`,
        );
      if (config.eligibilityProvider !== zeroAddress) {
        const code = await client.getCode({
          address: config.eligibilityProvider,
        });
        if (!code || code === "0x")
          throw new Error(
            "Eligibility provider has no contract code on HSK Testnet.",
          );
      }
      const allowance = await client.readContract({
        address: config.token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, factory],
      });
      if (allowance < config.totalAllocation) {
        if (allowance > 0n) {
          await tx.confirm("Reset token allowance", () =>
            writeContractAsync({
              address: config.token,
              abi: erc20Abi,
              functionName: "approve",
              args: [factory, 0n],
              chainId: 133,
              account: assertTestnetWallet(account),
            }),
          );
        }
        await tx.confirm("Approve token spending", () =>
          writeContractAsync({
            address: config.token,
            abi: erc20Abi,
            functionName: "approve",
            args: [factory, config.totalAllocation],
            chainId: 133,
            account: assertTestnetWallet(account),
          }),
        );
      }
      assertTestnetWallet(account);
      const simulation = await client.simulateContract({
        address: factory,
        abi: hashVestFactoryAbi,
        functionName: "createGrant",
        args: [config, items],
        account,
      });
      const receipt = await tx.confirm("Create and fund grant", () =>
        writeContractAsync({
          address: factory,
          abi: hashVestFactoryAbi,
          functionName: "createGrant",
          args: [config, items],
          chainId: 133,
          account: assertTestnetWallet(account),
        }),
      );
      setCreationConfirmed(true);
      const events = parseEventLogs({
        abi: hashVestFactoryAbi,
        eventName: "GrantCreated",
        logs: receipt.logs.filter(
          (log) => log.address.toLowerCase() === factory.toLowerCase(),
        ),
      });
      const expectedStart =
        config.start === 0n
          ? (await client.getBlock({ blockNumber: receipt.blockNumber }))
              .timestamp
          : config.start;
      // Match every immutable term and milestone. The simulation result and
      // event are preferred; the role index is a lagging HSK discovery fallback.
      let indexedAddress: Address | undefined;
      const matchesConfiguration = async (candidate: Address) => {
        try {
          const [
            candidateTitle,
            candidateIssuer,
            candidateBeneficiary,
            candidateReviewer,
            candidateToken,
            candidateAllocation,
            candidateStrategy,
            candidateStart,
            candidateCliff,
            candidateDuration,
            candidateProvider,
            candidateMilestones,
          ] = await Promise.all([
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "title",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "issuer",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "beneficiary",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "reviewer",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "token",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "totalAllocation",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "strategy",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "start",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "cliff",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "duration",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "eligibilityProvider",
            }),
            client.readContract({
              address: candidate,
              abi: grantVaultAbi,
              functionName: "getMilestones",
            }),
          ]);
          return (
            candidateTitle === config.title &&
            candidateIssuer.toLowerCase() === account.toLowerCase() &&
            candidateBeneficiary.toLowerCase() ===
              config.beneficiary.toLowerCase() &&
            candidateReviewer.toLowerCase() === config.reviewer.toLowerCase() &&
            candidateToken.toLowerCase() === config.token.toLowerCase() &&
            candidateAllocation === config.totalAllocation &&
            Number(candidateStrategy) === config.strategy &&
            candidateStart === expectedStart &&
            candidateCliff === config.cliff &&
            candidateDuration === config.duration &&
            candidateProvider.toLowerCase() ===
              config.eligibilityProvider.toLowerCase() &&
            candidateMilestones.length === items.length &&
            candidateMilestones.every(
              (milestone, index) =>
                milestone.title === items[index].title &&
                milestone.amount === items[index].amount &&
                !milestone.approved,
            )
          );
        } catch {
          return false;
        }
      };
      const candidates = [simulation.result, events[0]?.args.vault].filter(
        (candidate): candidate is Address => Boolean(candidate),
      );
      for (const candidate of candidates) {
        if (await matchesConfiguration(candidate)) {
          indexedAddress = candidate;
          break;
        }
      }
      for (let attempt = 0; attempt < 8 && !indexedAddress; attempt += 1) {
        const indexedGrants = await client.readContract({
          address: factory,
          abi: hashVestFactoryAbi,
          functionName: "getGrantsByIssuer",
          args: [account],
        });
        for (const candidate of [...indexedGrants].reverse()) {
          if (await matchesConfiguration(candidate)) {
            indexedAddress = candidate;
            break;
          }
        }
        if (!indexedAddress && attempt < 7)
          await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const created = indexedAddress;
      if (created) setCreatedAddress(created);
    });
  }

  function updateMilestone(
    index: number,
    key: keyof MilestoneInput,
    value: string,
  ) {
    setMilestones((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <PageHeading
        eyebrow="New allocation"
        title={creationConfirmed ? "Your grant is live." : "Create a grant."}
      >
        <p>
          {creationConfirmed
            ? "The full token allocation is in its own vault on HSK Testnet."
            : "Set the terms once. Fund the full allocation. Let the conditions do the rest."}
        </p>
      </PageHeading>
      <NetworkNotice />
      {!factory && (
        <Notice title="Testnet deployment is not configured">
          <p>
            Grant creation will be available after the HashVest contracts are
            deployed and synchronized.
          </p>
        </Notice>
      )}
      {creationConfirmed ? (
        <Card>
          <CardContent className="space-y-6 p-7">
            <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-2xl text-primary">
              ✓
            </div>
            <h2 className="text-2xl font-semibold">{prepared?.config.title}</h2>
            {createdAddress ? (
              <>
                <AddressDisplay address={createdAddress} full />
                <div>
                  <Link
                    className={buttonVariants()}
                    href={`/grants/${createdAddress}`}
                  >
                    Open grant →
                  </Link>
                </div>
              </>
            ) : (
              <p>
                The transaction confirmed. Find your new grant on the{" "}
                <Link href="/app" className="text-primary underline">
                  Issued dashboard
                </Link>
                .
              </p>
            )}
            <TransactionStatus {...tx} />
          </CardContent>
        </Card>
      ) : (
        <>
          <ol aria-label="Creation progress" className="grid grid-cols-4 gap-2">
            {steps.map((label, index) => (
              <li
                key={label}
                aria-current={step === index ? "step" : undefined}
                className={`border-b-2 pb-3 text-sm ${index <= step ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-secondary text-xs">
                  {index + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {
                  [
                    "Who is this grant for?",
                    "Choose how tokens unlock",
                    "Set the conditions",
                    "Review before funding",
                  ][step]
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (step < 3) next();
                }}
                className="space-y-6"
              >
                <fieldset className="min-w-0 space-y-6" disabled={tx.pending}>
                  {step === 0 && (
                    <>
                      <Field
                        label="Grant title"
                        hint="For example: Ecosystem builder grant or Contributor allocation."
                      >
                        <input
                          className="field"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          maxLength={120}
                          placeholder="Ecosystem builder grant"
                          autoComplete="off"
                        />
                      </Field>
                      <Field
                        label="Beneficiary wallet"
                        hint="Only this address can claim unlocked tokens. Double-check it."
                      >
                        <input
                          className="field font-mono"
                          value={beneficiary}
                          onChange={(event) =>
                            setBeneficiary(event.target.value.trim())
                          }
                          placeholder="0x…"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </Field>
                      <Field
                        label="ERC20 token address"
                        hint="Use a normal ERC20 on HSK Testnet. Native HSK and fee-on-transfer tokens are unsupported."
                      >
                        <input
                          className="field font-mono"
                          value={token}
                          onChange={(event) =>
                            setToken(event.target.value.trim())
                          }
                          placeholder="0x…"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </Field>
                      {testnetDeployment.demoToken && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setToken(testnetDeployment.demoToken ?? "")
                          }
                        >
                          Use demo hvUSD
                        </Button>
                      )}
                      {isAddress(token) && (
                        <p className="text-xs text-muted-foreground">
                          {tokenMetadata.isPending
                            ? "Reading token metadata on HSK Testnet…"
                            : tokenMetadata.isError
                              ? "Could not read this token. Confirm the address and network."
                              : `${tokenMetadata.data?.symbol} · ${tokenMetadata.data?.decimals} decimals`}
                        </p>
                      )}
                      <Field
                        label="Total allocation"
                        hint="Enter token units, not base units. The full amount is transferred into the vault."
                      >
                        <input
                          className="field"
                          value={allocation}
                          onChange={(event) =>
                            setAllocation(event.target.value)
                          }
                          inputMode="decimal"
                          placeholder="1000"
                          autoComplete="off"
                        />
                      </Field>
                    </>
                  )}
                  {step === 1 && (
                    <div className="space-y-3">
                      {strategies.map((name, index) => (
                        <label
                          key={name}
                          className={`flex cursor-pointer items-start gap-4 rounded-xl border p-5 ${strategy === index ? "border-primary bg-primary/5" : "bg-card"}`}
                        >
                          <input
                            className="mt-1 accent-primary"
                            type="radio"
                            name="strategy"
                            checked={strategy === index}
                            onChange={() =>
                              setStrategy(index === 0 ? 0 : index === 1 ? 1 : 2)
                            }
                          />
                          <span>
                            <span className="block font-semibold">{name}</span>
                            <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                              {strategyDescriptions[index]}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {step === 2 && (
                    <>
                      {strategy !== 1 && (
                        <div className="space-y-5">
                          <div>
                            <h3 className="font-semibold">Vesting schedule</h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              Vesting is linear from the start. At the cliff,
                              the elapsed portion becomes available.
                            </p>
                          </div>
                          <Field
                            label="Start date (optional)"
                            hint="Your local timezone. Leave empty to start at the creation transaction timestamp. A past start releases its elapsed portion immediately."
                          >
                            <input
                              className="field"
                              type="datetime-local"
                              value={start}
                              onChange={(event) => setStart(event.target.value)}
                            />
                          </Field>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Schedule unit">
                              <select
                                className="field"
                                value={unit}
                                onChange={(event) =>
                                  setUnit(event.target.value)
                                }
                              >
                                <option value="60">Minutes</option>
                                <option value="3600">Hours</option>
                                <option value="86400">Days</option>
                              </select>
                            </Field>
                            <Field label="Cliff">
                              <input
                                className="field"
                                inputMode="numeric"
                                value={cliff}
                                onChange={(event) =>
                                  setCliff(event.target.value)
                                }
                              />
                            </Field>
                            <Field label="Total duration">
                              <input
                                className="field"
                                inputMode="numeric"
                                value={duration}
                                onChange={(event) =>
                                  setDuration(event.target.value)
                                }
                              />
                            </Field>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Demo tip: use a 5-minute duration and a 0-minute
                            cliff.
                          </p>
                        </div>
                      )}
                      {strategy !== 0 && (
                        <div className="space-y-5">
                          <Field
                            label="Reviewer wallet"
                            hint="This wallet may approve milestones. Amounts and terms cannot be edited."
                          >
                            <input
                              className="field font-mono"
                              value={reviewer}
                              onChange={(event) =>
                                setReviewer(event.target.value.trim())
                              }
                              placeholder="0x…"
                              spellCheck={false}
                            />
                          </Field>
                          <div>
                            <h3 className="font-semibold">Milestones</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Amounts must total exactly{" "}
                              {allocation || "the allocation"}{" "}
                              {tokenMetadata.data?.symbol}. Up to 20 milestones.
                            </p>
                          </div>
                          {milestones.map((item, index) => (
                            <div
                              className="space-y-3 rounded-xl border bg-secondary/30 p-4"
                              key={index}
                            >
                              <div className="flex justify-between">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Milestone {index + 1}
                                </p>
                                {milestones.length > 1 && (
                                  <button
                                    className="text-xs text-destructive"
                                    type="button"
                                    onClick={() =>
                                      setMilestones((items) =>
                                        items.filter(
                                          (_, itemIndex) => itemIndex !== index,
                                        ),
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                                <Field label="Title">
                                  <input
                                    className="field"
                                    value={item.title}
                                    onChange={(event) =>
                                      updateMilestone(
                                        index,
                                        "title",
                                        event.target.value,
                                      )
                                    }
                                    maxLength={120}
                                    placeholder="Deliver working prototype"
                                  />
                                </Field>
                                <Field
                                  label={`Amount (${tokenMetadata.data?.symbol ?? "tokens"})`}
                                >
                                  <input
                                    className="field"
                                    inputMode="decimal"
                                    value={item.amount}
                                    onChange={(event) =>
                                      updateMilestone(
                                        index,
                                        "amount",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="500"
                                  />
                                </Field>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            disabled={milestones.length >= 20}
                            onClick={() =>
                              setMilestones((items) => [
                                ...items,
                                { title: "", amount: "" },
                              ])
                            }
                          >
                            Add milestone +
                          </Button>
                        </div>
                      )}
                      <details className="rounded-xl border p-4">
                        <summary className="cursor-pointer text-sm font-medium">
                          Advanced · optional eligibility provider
                        </summary>
                        <div className="mt-4">
                          <Field
                            label="Eligibility provider address"
                            hint="Leave empty for no eligibility check. The provider must implement isEligible(address). This demo adapter is not KYC or compliance."
                          >
                            <input
                              className="field font-mono"
                              value={provider}
                              onChange={(event) =>
                                setProvider(event.target.value.trim())
                              }
                              placeholder="None"
                              spellCheck={false}
                            />
                          </Field>
                        </div>
                      </details>
                    </>
                  )}
                  {step === 3 && prepared && (
                    <>
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {strategies[prepared.config.strategy]}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold">
                          {prepared.config.title}
                        </h3>
                        <p className="mt-4 break-all text-3xl font-semibold">
                          {formatUnits(
                            prepared.config.totalAllocation,
                            prepared.decimals,
                          )}{" "}
                          <span className="text-lg text-muted-foreground">
                            {prepared.symbol}
                          </span>
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {strategyDescriptions[prepared.config.strategy]}
                        </p>
                      </div>
                      <dl className="space-y-4 text-sm">
                        {[
                          ["Issuer", prepared.issuer],
                          ["Beneficiary", prepared.config.beneficiary],
                          ["Token", prepared.config.token],
                          ...(strategy !== 0
                            ? [["Reviewer", prepared.config.reviewer]]
                            : []),
                        ].map(([label, party]) => (
                          <div
                            key={label}
                            className="flex flex-wrap justify-between gap-2"
                          >
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd>
                              <AddressDisplay
                                address={getAddress(party)}
                                full
                              />
                            </dd>
                          </div>
                        ))}
                        {strategy !== 1 && (
                          <>
                            <div className="flex justify-between gap-4">
                              <dt className="text-muted-foreground">Start</dt>
                              <dd>
                                {prepared.config.start === 0n
                                  ? "Creation timestamp"
                                  : dateLabel(prepared.config.start)}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-muted-foreground">
                                Cliff / total duration
                              </dt>
                              <dd>
                                {prepared.config.cliff.toString()}s /{" "}
                                {prepared.config.duration.toString()}s
                              </dd>
                            </div>
                          </>
                        )}
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-muted-foreground">
                            Eligibility provider
                          </dt>
                          <dd>
                            {prepared.config.eligibilityProvider ===
                            zeroAddress ? (
                              "None — disabled"
                            ) : (
                              <AddressDisplay
                                address={prepared.config.eligibilityProvider}
                                full
                              />
                            )}
                          </dd>
                        </div>
                      </dl>
                      {prepared.milestones.length > 0 && (
                        <div className="space-y-3 border-t pt-4">
                          {prepared.milestones.map((item, index) => (
                            <div
                              className="flex justify-between gap-4 text-sm"
                              key={index}
                            >
                              <span>
                                {index + 1}. {item.title}
                              </span>
                              <strong className="break-all text-right">
                                {formatUnits(item.amount, prepared.decimals)}{" "}
                                {prepared.symbol}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                      <Notice title="These terms are permanent">
                        <p>
                          No revocation, withdrawals by the issuer, or changes
                          to grant economics. You will approve token spending if
                          needed, then create and fully fund the vault in one
                          transaction.
                        </p>
                      </Notice>
                    </>
                  )}
                </fieldset>
                {validationError && (
                  <p role="alert" className="text-sm text-destructive">
                    {validationError}
                  </p>
                )}
                <div className="flex justify-between gap-3 border-t pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={step === 0 || tx.pending}
                    onClick={() => {
                      setStep((current) => current - 1);
                      setValidationError("");
                    }}
                  >
                    Back
                  </Button>
                  {step < 3 ? (
                    <Button type="submit" disabled={step === 2 && !address}>
                      Continue →
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={
                        !canWrite ||
                        tx.pending ||
                        !prepared ||
                        address?.toLowerCase() !== prepared.issuer.toLowerCase()
                      }
                      onClick={() => void createGrant()}
                    >
                      {tx.pending
                        ? "Transaction in progress…"
                        : "Approve & create grant"}
                    </Button>
                  )}
                </div>
                {prepared &&
                  step === 3 &&
                  address &&
                  address.toLowerCase() !== prepared.issuer.toLowerCase() && (
                    <p role="alert" className="text-sm text-destructive">
                      Wallet changed. Go back and review with the current
                      issuer.
                    </p>
                  )}
                <TransactionStatus {...tx} />
              </form>
            </CardContent>
          </Card>
          {step === 0 && <DemoFaucet />}
        </>
      )}
    </div>
  );
}
