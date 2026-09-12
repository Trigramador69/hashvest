"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi } from "viem";
import { demoTokenAbi, testnetDeployment } from "@hashvest/web3";
import { Button } from "@/components/ui/button";
import { AddressDisplay, TransactionStatus } from "@/components/grant-ui";
import { useTransaction, assertTestnetWallet } from "@/hooks/use-transaction";
import { tokenAmount } from "@/lib/protocol/grants";

export function DemoFaucet() {
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
          <p className="text-sm font-semibold">Demo token · hvUSD</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Test tokens for your first grant. No monetary value.
          </p>
          <div className="mt-2">
            <AddressDisplay address={token} />
          </div>
          {balance.data !== undefined && (
            <p className="mt-2 text-sm">
              Your balance:{" "}
              <strong>{tokenAmount(balance.data, 18)} hvUSD</strong>
            </p>
          )}
          {balance.isError && (
            <p className="mt-2 text-xs text-destructive">
              Token balance is unavailable. Check the Testnet RPC.
            </p>
          )}
        </div>
        <Button
          variant="outline"
          disabled={!address || chainId !== 133 || tx.pending}
          onClick={() =>
            void tx.run(async () => {
              const account = assertTestnetWallet(address);
              await tx.confirm("Get demo hvUSD", () =>
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
          {tx.pending ? "Minting…" : "Get demo hvUSD"}
        </Button>
      </div>
      <TransactionStatus {...tx} />
    </div>
  );
}
