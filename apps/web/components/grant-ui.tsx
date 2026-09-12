"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSwitchChain } from "wagmi";
import { addressExplorerUrl, transactionExplorerUrl } from "@hashvest/web3";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import { errorMessage, shortAddress, tokenAmount } from "@/lib/protocol/grants";
import type {
  GrantFundingHealth,
  GrantLifecycle,
} from "@/lib/protocol/grant-state";
import type { TransactionRecord } from "@/hooks/use-transaction";
import {
  hskTestnetAddChainParameter,
  hskTestnetSwitchParameter,
  isBrowserProvider,
  probeWalletRpc,
} from "@/lib/protocol/network";

export function NetworkNotice() {
  const { isConnected, chainId, connector } = useAccount();
  const { switchChain, switchChainAsync, isPending, error } = useSwitchChain();
  const connectionKey = `${connector?.uid ?? connector?.id ?? "none"}:${isConnected ? (chainId ?? "unknown") : "disconnected"}`;
  const [rpcProbe, setRpcProbe] = useState<{
    key: string;
    status: "checking" | "healthy" | "unavailable";
  }>({ key: "", status: "checking" });
  const [repairState, setRepairState] = useState({ key: "", error: "" });
  const [repairPending, setRepairPending] = useState(false);
  const rpcHealth =
    rpcProbe.key === connectionKey ? rpcProbe.status : "checking";
  const repairError =
    repairState.key === connectionKey ? repairState.error : "";

  useEffect(() => {
    let cancelled = false;
    if (!isConnected || chainId !== 133 || !connector) {
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        const provider = await connector.getProvider();
        if (!isBrowserProvider(provider))
          throw new Error("Wallet provider unavailable.");
        await probeWalletRpc(provider);
        if (!cancelled) setRpcProbe({ key: connectionKey, status: "healthy" });
      } catch {
        if (!cancelled)
          setRpcProbe({ key: connectionKey, status: "unavailable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chainId, connectionKey, connector, isConnected]);

  async function repairRpc() {
    if (!connector) return;
    setRepairPending(true);
    setRepairState({ key: connectionKey, error: "" });
    try {
      const provider = await connector.getProvider();
      if (!isBrowserProvider(provider))
        throw new Error("Your wallet provider is unavailable.");
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [hskTestnetAddChainParameter],
      });
      await switchChainAsync({
        chainId: 133,
        addEthereumChainParameter: hskTestnetSwitchParameter,
      });
      await probeWalletRpc(provider);
      setRpcProbe({ key: connectionKey, status: "healthy" });
    } catch (cause) {
      setRpcProbe({ key: connectionKey, status: "unavailable" });
      setRepairState({ key: connectionKey, error: errorMessage(cause) });
    } finally {
      setRepairPending(false);
    }
  }

  if (!isConnected)
    return (
      <Notice title="Connect a wallet to get started">
        <p>
          Connect your issuer, beneficiary, or reviewer wallet. All grants live
          on HSK Testnet.
        </p>
        <div className="mt-4">
          <ConnectButton showBalance={false} />
        </div>
      </Notice>
    );
  if (chainId !== 133)
    return (
      <Notice title="Switch to HSK Testnet">
        <p>
          Your wallet is on another network. Transactions are enabled only on
          chain 133.
        </p>
        <Button
          className="mt-4"
          onClick={() =>
            switchChain({
              chainId: 133,
              addEthereumChainParameter: hskTestnetSwitchParameter,
            })
          }
          disabled={isPending}
        >
          {isPending ? "Switching…" : "Switch to HSK Testnet"}
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-destructive">
            {errorMessage(error)}
          </p>
        )}
      </Notice>
    );
  if (rpcHealth !== "unavailable") return null;
  return (
    <Notice title="Your HSK Testnet wallet RPC is unavailable" error>
      <p>
        The wallet reports chain 133, but its RPC cannot read the latest block.
        HashVest uses the canonical HSK endpoint at{" "}
        <code>https://testnet.hsk.xyz</code>. A stale third-party RPC can make a
        valid token approval look like a contract revert.
      </p>
      <Button
        className="mt-4"
        onClick={() => void repairRpc()}
        disabled={repairPending}
      >
        {repairPending ? "Updating wallet RPC…" : "Use canonical HSK RPC"}
      </Button>
      <p className="mt-3 text-xs">
        If your wallet rejects the update, edit HSK Testnet manually: RPC URL{" "}
        <code>https://testnet.hsk.xyz</code>, chain ID <code>133</code>.
      </p>
      {repairError && (
        <p role="alert" className="mt-3 break-words text-destructive">
          {repairError}
        </p>
      )}
    </Notice>
  );
}

export function Notice({
  title,
  children,
  error = false,
}: {
  title: string;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : undefined}
      className={`rounded-xl border p-5 ${error ? "border-destructive/25 bg-destructive/5" : "bg-secondary/50"}`}
    >
      <p className="mb-1 font-semibold">{title}</p>
      <div className="text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

export function AddressDisplay({
  address,
  full = false,
}: {
  address: Address;
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(true);
    }
  }
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-2">
      <a
        className="break-all font-mono text-xs underline decoration-border underline-offset-4 hover:text-primary"
        href={addressExplorerUrl(address)}
        target="_blank"
        rel="noreferrer"
        title={address}
      >
        {full ? address : shortAddress(address)} ↗
      </a>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-primary"
        onClick={copy}
        aria-label={`Copy ${address}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          Copy unavailable; select the address.
        </span>
      )}
    </span>
  );
}

export function TransactionStatus({
  stage,
  error,
  transactions,
}: {
  stage: string;
  error: string;
  transactions: TransactionRecord[];
}) {
  if (!stage && !error && !transactions.length) return null;
  return (
    <div
      aria-live="polite"
      className="space-y-2 rounded-xl border bg-card p-4 text-sm"
    >
      {stage && <p className="font-medium">{stage}</p>}
      {error && (
        <p role="alert" className="break-words text-destructive">
          {error}
        </p>
      )}
      {transactions.map((transaction) => (
        <a
          className="block text-primary underline underline-offset-4"
          key={transaction.hash}
          href={transactionExplorerUrl(transaction.hash)}
          target="_blank"
          rel="noreferrer"
        >
          {transaction.label} ·{" "}
          {transaction.confirmed ? "confirmed" : "submitted"} ·{" "}
          {shortAddress(transaction.hash)} ↗
        </a>
      ))}
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function GrantLifecycleBadge({
  lifecycle,
}: {
  lifecycle: GrantLifecycle;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        lifecycle === "REVOKED"
          ? "bg-destructive/10 text-destructive font-semibold"
          : lifecycle === "COMPLETED"
            ? "bg-secondary text-muted-foreground"
            : "bg-primary/10 text-primary"
      }`}
    >
      {lifecycle === "REVOKED"
        ? "Revoked"
        : lifecycle === "COMPLETED"
          ? "Completed"
          : "Active"}
    </span>
  );
}

export function FundingHealthSummary({
  funding,
  totalAllocation,
  vaultBalance,
  decimals,
  symbol,
  compact = false,
}: {
  funding: GrantFundingHealth;
  totalAllocation: bigint;
  vaultBalance: bigint;
  decimals: number;
  symbol: string;
  compact?: boolean;
}) {
  const shortfall =
    funding.requiredVaultBalance > vaultBalance
      ? funding.requiredVaultBalance - vaultBalance
      : 0n;
  return (
    <div
      className={`rounded-xl border ${funding.isFullyFunded ? "border-primary/25 bg-primary/5" : "border-destructive/25 bg-destructive/5"} ${compact ? "p-4" : "p-5"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Funding health
          </p>
          <p className="mt-1 text-lg font-semibold">
            {funding.isFullyFunded
              ? "100% funded"
              : `${funding.percent}% funded`}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${funding.isFullyFunded ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
        >
          {funding.isFullyFunded ? "Healthy" : "Underfunded"}
        </span>
      </div>
      <div className="mt-3">
        <Progress value={funding.percent} label="Grant funding health" />
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Allocation</dt>
          <dd className="mt-1 break-all font-medium">
            {tokenAmount(totalAllocation, decimals)} {symbol}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Vault balance</dt>
          <dd className="mt-1 break-all font-medium">
            {tokenAmount(vaultBalance, decimals)} {symbol}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Required after claims</dt>
          <dd className="mt-1 break-all font-medium">
            {tokenAmount(funding.requiredVaultBalance, decimals)} {symbol}
          </dd>
        </div>
      </dl>
      {shortfall > 0n && (
        <p className="mt-3 text-xs font-medium text-destructive">
          Shortfall: {tokenAmount(shortfall, decimals)} {symbol}
        </p>
      )}
      {funding.surplusAmount > 0n && (
        <p className="mt-3 text-xs text-muted-foreground">
          Extra vault balance: {tokenAmount(funding.surplusAmount, decimals)}{" "}
          {symbol}. This is outside the fixed allocation.
        </p>
      )}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {children && (
          <div className="mt-3 leading-7 text-muted-foreground">{children}</div>
        )}
      </div>
      {action}
    </div>
  );
}
