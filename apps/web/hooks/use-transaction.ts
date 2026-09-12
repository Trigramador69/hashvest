"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { getAccount } from "wagmi/actions";
import type { Address, Hash } from "viem";
import { wagmiConfig } from "@/lib/wagmi";
import { errorMessage } from "@/lib/grants";

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
  const client = usePublicClient({ chainId: 133 });
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  async function confirm(label: string, send: () => Promise<Hash>) {
    if (!client) throw new Error("HSK Testnet RPC is unavailable.");
    assertTestnetWallet();
    setStage(`${label}: confirm in your wallet`);
    const hash = await send();
    setTransactions((items) => [...items, { label, hash, confirmed: false }]);
    setStage(`${label}: waiting for confirmation`);
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(
        `${label} reverted onchain. No changes from this transaction were applied.`,
      );
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
      setStage("Transaction confirmed. Onchain state is up to date.");
    } catch (cause) {
      setError(errorMessage(cause));
      setStage("");
    } finally {
      setPending(false);
    }
  }

  return { pending, stage, error, transactions, confirm, run };
}
