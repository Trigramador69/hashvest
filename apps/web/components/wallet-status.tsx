"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";

import { hskChains } from "@hashvest/web3";
import { useTranslations } from "@/lib/shared/i18n/provider";

/** Wallet addresses are technical literals: truncated, never translated. */
function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const selectedChain = hskChains.find((chain) => chain.id === chainId);
  const t = useTranslations();

  return (
    <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
      <ConnectButton showBalance={false} />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t("wallet.label")}</dt>
          <dd className="font-medium">
            {isConnected && address
              ? formatAddress(address)
              : t("wallet.notConnected")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("wallet.selectedChain")}</dt>
          <dd className="font-medium">
            {/* Chain name and id come from the protocol package as-is. */}
            {selectedChain
              ? `${selectedChain.name} (${selectedChain.id})`
              : t("wallet.unknownChain", { chainId })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
