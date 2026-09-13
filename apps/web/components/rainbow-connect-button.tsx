"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, LoaderCircle, Network, Wallet } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { cn } from "@/lib/shared/utils";

/**
 * RainbowKit still owns connection, account and network modals. This wrapper
 * only owns their triggers so wallet state remains in wagmi/RainbowKit while
 * the visible controls use the HashVest button tokens.
 */
export function RainbowConnectButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const t = useTranslations();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        authenticationStatus,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        if (!ready) return null;

        if (!connected) {
          return (
            <button
              type="button"
              aria-label={t("wallet.connect")}
              title={t("wallet.connect")}
              className={buttonVariants({
                size: "default",
                className: compact ? "max-sm:size-11 max-sm:px-0" : undefined,
              })}
              onClick={openConnectModal}
            >
              <Wallet className="size-4" strokeWidth={1.25} />
              <span className={compact ? "max-sm:sr-only" : undefined}>
                {t("wallet.connect")}
              </span>
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className:
                  "border-[#E9832D]/50 text-[#E9832D] hover:border-[#E9832D] hover:bg-[#E9832D]/10",
              })}
              onClick={openChainModal}
            >
              <Network className="size-4" strokeWidth={1.25} />
              {t("wallet.wrongNetwork")}
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("wallet.changeNetwork")}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "max-w-[11rem] px-2.5",
              })}
              onClick={openChainModal}
            >
              <Network className="size-4 shrink-0" strokeWidth={1.25} />
              <span className="hidden truncate lg:inline">{chain.name}</span>
              <ChevronDown
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.25}
              />
            </button>
            <button
              type="button"
              aria-label={t("wallet.account")}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "max-w-[12rem] px-2.5",
              )}
              onClick={openAccountModal}
            >
              {account.hasPendingTransactions ? (
                <LoaderCircle
                  aria-hidden
                  className="size-4 motion-safe:animate-spin"
                  strokeWidth={1.25}
                />
              ) : (
                <Wallet className="size-4" strokeWidth={1.25} />
              )}
              <span className="hidden truncate sm:inline">
                {account.displayName}
              </span>
              <ChevronDown
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.25}
              />
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
