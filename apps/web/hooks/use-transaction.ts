"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { getAccount } from "wagmi/actions";
import type { Address, Hash } from "viem";
import { hskTestnet } from "@hashvest/web3";
import { wagmiConfig } from "@/lib/protocol/wagmi";
import { errorMessage } from "@/lib/protocol/grants";
import type { Translator } from "@/lib/shared/i18n/dictionary";
import { useTranslations } from "@/lib/shared/i18n/provider";

const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

export type WalletGuardMessages = {
  notConnected: string;
  wrongNetwork: string;
  walletChanged: string;
};

export function getWalletGuardMessages(t: Translator): WalletGuardMessages {
  return {
    notConnected: t("tx.error.notConnected"),
    wrongNetwork: t("tx.error.wrongNetwork", NETWORK),
    walletChanged: t("tx.error.walletChanged"),
  };
}

export type TransactionRecord = {
  label: string;
  hash: Hash;
  confirmed: boolean;
};

export function assertTestnetWallet(
  expectedAddress?: Address,
  messages?: Partial<WalletGuardMessages>,
) {
  const localized = {
    notConnected: "Connect your wallet to continue.",
    wrongNetwork: "Switch your wallet to HSK Testnet (133) to continue.",
    walletChanged:
      "Your wallet changed. Review the grant again before continuing.",
    ...messages,
  };
  const account = getAccount(wagmiConfig);
  if (!account.address || !account.isConnected)
    throw new Error(localized.notConnected);
  if (account.chainId !== 133) throw new Error(localized.wrongNetwork);
  if (
    expectedAddress &&
    account.address.toLowerCase() !== expectedAddress.toLowerCase()
  )
    throw new Error(localized.walletChanged);
  return account.address;
}

export function useTransaction() {
  const t = useTranslations();
  const walletMessages = getWalletGuardMessages(t);
  const client = usePublicClient({ chainId: 133 });
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  async function confirm(label: string, send: () => Promise<Hash>) {
    if (!client) throw new Error(t("tx.error.rpcUnavailable", NETWORK));
    assertTestnetWallet(undefined, walletMessages);
    setStage(t("tx.stage.confirm", { label }));
    const hash = await send();
    setTransactions((items) => [...items, { label, hash, confirmed: false }]);
    setStage(t("tx.stage.waiting", { label }));
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(t("tx.stage.reverted", { label }));
    setTransactions((items) =>
      items.map((item) =>
        item.hash === hash ? { ...item, confirmed: true } : item,
      ),
    );
    await queryClient.invalidateQueries();
    return receipt;
  }

  async function run(work: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError("");
    setStage("");
    setTransactions([]);
    try {
      assertTestnetWallet(undefined, walletMessages);
      await work();
      setStage(t("tx.stage.confirmed"));
    } catch (cause) {
      setError(
        errorMessage(cause, {
          // Workflows throw translated validation/wallet messages already;
          // only replace the known raw RPC diagnostic here.
          rpcUnavailable: t("tx.error.rpcUnavailable", NETWORK),
        }),
      );
      setStage("");
    } finally {
      setPending(false);
    }
  }

  return { pending, stage, error, transactions, confirm, run };
}
