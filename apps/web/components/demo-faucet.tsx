"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi } from "viem";
import { demoTokenAbi, testnetDeployment } from "@hashvest/web3";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { Button } from "@/components/ui/button";
import { AddressDisplay, TransactionStatus } from "@/components/grant-ui";
import {
  assertTestnetWallet,
  getWalletGuardMessages,
  useTransaction,
} from "@/hooks/use-transaction";
import { tokenAmount } from "@/lib/protocol/grants";

/** The demo token's symbol and decimals are protocol literals. */
const DEMO_SYMBOL = "hvUSD";
const DEMO_DECIMALS = 18;

export function DemoFaucet() {
  const t = useTranslations();
  const walletMessages = getWalletGuardMessages(t);
  const { address, chainId } = useAccount();
  const token = testnetDeployment.demoToken;
  const { writeContractAsync } = useWriteContract();
  const tx = useTransaction();
  const balance = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 133,
    query: { enabled: Boolean(token && address), refetchInterval: 7000 },
  });
  if (!token) return null;
  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">
            {t("faucet.title", { symbol: DEMO_SYMBOL })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("faucet.lede")}
          </p>
          <div className="mt-2">
            <AddressDisplay address={token} />
          </div>
          {balance.data !== undefined && (
            <p className="mt-2 text-sm">
              {t("faucet.balance")}{" "}
              <strong>
                {tokenAmount(balance.data, DEMO_DECIMALS)} {DEMO_SYMBOL}
              </strong>
            </p>
          )}
          {balance.isError && (
            <p className="mt-2 text-xs text-destructive">
              {t("faucet.balanceError")}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          disabled={!address || chainId !== 133 || tx.pending}
          onClick={() =>
            void tx.run(async () => {
              const account = assertTestnetWallet(address, walletMessages);
              await tx.confirm(
                t("faucet.action", { symbol: DEMO_SYMBOL }),
                () =>
                  writeContractAsync({
                    address: token,
                    abi: demoTokenAbi,
                    functionName: "faucet",
                    chainId: 133,
                    account,
                  }),
              );
            })
          }
        >
          {tx.pending
            ? t("faucet.minting")
            : t("faucet.action", { symbol: DEMO_SYMBOL })}
        </Button>
      </div>
      <TransactionStatus {...tx} />
    </div>
  );
}
