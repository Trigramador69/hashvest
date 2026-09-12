"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSwitchChain } from "wagmi";
import {
  addressExplorerUrl,
  hskTestnet,
  transactionExplorerUrl,
} from "@hashvest/web3";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/shared/i18n/provider";
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

/** Protocol literals: never translated, only interpolated into messages. */
const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };
const CANONICAL_RPC_URL = hskTestnet.rpcUrls.default.http[0];

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
  const t = useTranslations();
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
          // Swallowed by the catch below; it only flips the probe to
          // "unavailable" and is never rendered.
          throw new Error(t("ui.wallet.providerUnavailableRepair"));
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
  }, [chainId, connectionKey, connector, isConnected, t]);

  async function repairRpc() {
    if (!connector) return;
    setRepairPending(true);
    setRepairState({ key: connectionKey, error: "" });
    try {
      const provider = await connector.getProvider();
      if (!isBrowserProvider(provider))
        throw new Error(t("ui.wallet.providerUnavailableRepair"));
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
      setRepairState({
        key: connectionKey,
        error: errorMessage(cause, {
          fallback: t("ui.error.requestFailed"),
          rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
          preserve: [t("ui.wallet.providerUnavailableRepair")],
        }),
      });
    } finally {
      setRepairPending(false);
    }
  }

  if (!isConnected)
    return (
      <Notice title={t("ui.connect.title")}>
        <p>{t("ui.connect.body", NETWORK)}</p>
        <div className="mt-4">
          <ConnectButton showBalance={false} />
        </div>
      </Notice>
    );
  if (chainId !== 133)
    return (
      <Notice title={t("ui.switch.title", NETWORK)}>
        <p>{t("ui.switch.body", NETWORK)}</p>
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
          {isPending
            ? t("ui.switch.switching")
            : t("ui.switch.action", NETWORK)}
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-destructive">
            {errorMessage(error, {
              fallback: t("ui.error.requestFailed"),
              rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
            })}
          </p>
        )}
      </Notice>
    );
  if (rpcHealth !== "unavailable") return null;
  return (
    <Notice title={t("ui.rpc.title", NETWORK)} error>
      <p>
        {t("ui.rpc.body.before", NETWORK)}
        <code>{CANONICAL_RPC_URL}</code>
        {t("ui.rpc.body.after")}
      </p>
      <Button
        className="mt-4"
        onClick={() => void repairRpc()}
        disabled={repairPending}
      >
        {repairPending ? t("ui.rpc.updating") : t("ui.rpc.action")}
      </Button>
      <p className="mt-3 text-xs">
        {t("ui.rpc.manual.before", NETWORK)}
        <code>{CANONICAL_RPC_URL}</code>
        {t("ui.rpc.manual.middle")}
        <code>{hskTestnet.id}</code>
        {t("ui.rpc.manual.after")}
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
  const t = useTranslations();
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
        aria-label={t("ui.address.copy", { address })}
      >
        {copied ? t("ui.address.copied") : t("ui.address.copyAction")}
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {t("ui.address.copyUnavailable")}
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
  const t = useTranslations();
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
          {transaction.confirmed ? t("ui.tx.confirmed") : t("ui.tx.submitted")}{" "}
          · {shortAddress(transaction.hash)} ↗
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
  const t = useTranslations();
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
        ? t("ui.lifecycle.revoked")
        : lifecycle === "COMPLETED"
          ? t("ui.lifecycle.completed")
          : t("ui.lifecycle.active")}
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
  const t = useTranslations();
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
            {t("ui.funding.title")}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {t("ui.funding.percent", {
              percent: funding.isFullyFunded ? 100 : funding.percent,
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${funding.isFullyFunded ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
        >
          {funding.isFullyFunded
            ? t("ui.funding.healthy")
            : t("ui.funding.underfunded")}
        </span>
      </div>
      <div className="mt-3">
        <Progress
          value={funding.percent}
          label={t("ui.funding.progressLabel")}
        />
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">
            {t("ui.funding.allocation")}
          </dt>
          <dd className="mt-1 break-all font-medium">
            {tokenAmount(totalAllocation, decimals)} {symbol}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("ui.funding.vaultBalance")}
          </dt>
          <dd className="mt-1 break-all font-medium">
            {tokenAmount(vaultBalance, decimals)} {symbol}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("ui.funding.required")}</dt>
          <dd className="mt-1 break-all font-medium">
            {tokenAmount(funding.requiredVaultBalance, decimals)} {symbol}
          </dd>
        </div>
      </dl>
      {shortfall > 0n && (
        <p className="mt-3 text-xs font-medium text-destructive">
          {t("ui.funding.shortfall", {
            amount: `${tokenAmount(shortfall, decimals)} ${symbol}`,
          })}
        </p>
      )}
      {funding.surplusAmount > 0n && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("ui.funding.surplus", {
            amount: `${tokenAmount(funding.surplusAmount, decimals)} ${symbol}`,
          })}
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
