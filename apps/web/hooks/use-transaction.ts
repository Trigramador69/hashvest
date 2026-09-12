"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { getAccount } from "wagmi/actions";
import type { Address, Hash } from "viem";
import { wagmiConfig } from "@/lib/protocol/wagmi";
import { errorMessage } from "@/lib/protocol/grants";
import { useTranslations } from "@/lib/shared/i18n/provider";

export type TransactionRecord = {
  label: string;
  hash: Hash;
  confirmed: boolean;
};

export function assertTestnetWallet(expectedAddress?: Address) {
  const account = getAccount(wagmiConfig);
  if (!account.address || !account.isConnected)
    throw new Error("Connect your wallet to continue.");
  if (account.chainId !== 133)
    throw new Error("Switch your wallet to HSK Testnet (133) to continue.");
  if (
    expectedAddress &&
    account.address.toLowerCase() !== expectedAddress.toLowerCase()
  )
    throw new Error(
      "Your wallet changed. Review the grant again before continuing.",
    );
  return account.address;
}

export function useTransaction() {
  const t = useTranslations();
  const client = usePublicClient({ chainId: 133 });
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  async function confirm(label: string, send: () => Promise<Hash>) {
    if (!client) throw new Error("HSK Testnet RPC is unavailable.");
    assertTestnetWallet();
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
      assertTestnetWallet();
      await work();
      setStage(t("tx.stage.confirmed"));
    } catch (cause) {
      setError(errorMessage(cause));
      setStage("");
    } finally {
      setPending(false);
    }
  }

  return { pending, stage, error, transactions, confirm, run };
}
