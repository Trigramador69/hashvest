"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";

import { hskChains } from "@hashvest/web3";

function formatAddress(address: string | undefined) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const selectedChain = hskChains.find((chain) => chain.id === chainId);

  return (
    <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
      <ConnectButton showBalance={false} />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Wallet</dt>
          <dd className="font-medium">
            {isConnected ? formatAddress(address) : "Not connected"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Selected chain</dt>
          <dd className="font-medium">
            {selectedChain
              ? `${selectedChain.name} (${selectedChain.id})`
              : `Chain ${chainId}`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
