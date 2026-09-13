"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAddress } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import { getAccount } from "wagmi/actions";

import { hskTestnet } from "@hashvest/web3";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { errorMessage } from "@/lib/protocol/grants";
import { organizationApi } from "@/lib/cloud/organizations/client";
import { useSession, useSessionActions } from "@/hooks/use-session";
import { wagmiConfig } from "@/lib/protocol/wagmi";

export function SessionControl({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const session = useSession();
  const { signMessageAsync } = useSignMessage();
  const { clearSession } = useSessionActions();
  const t = useTranslations();
  // Network name and chain id are protocol literals; only the sentence around
  // them is translated.
  const network = { network: hskTestnet.name, chainId: hskTestnet.id };
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");

  async function signIn() {
    if (!address) return;
    setPending(true);
    setActionError("");
    try {
      if (chainId !== 133)
        throw new Error(t("session.switchNetworkChain", network));
      const requestedWallet = address.toLowerCase();
      const challenge = await organizationApi.requestNonce(address, 133);
      const signature = await signMessageAsync({ message: challenge.message });
      const currentAccount = getAccount(wagmiConfig);
      if (
        !currentAccount.address ||
        currentAccount.address.toLowerCase() !== requestedWallet
      )
        throw new Error(t("session.walletChanged"));
      await organizationApi.verifySignature(challenge.message, signature);
      await session.refetch();
      router.refresh();
    } catch (error) {
      setActionError(
        errorMessage(error, {
          fallback: t("ui.error.requestFailed"),
          rpcUnavailable: t("tx.error.rpcUnavailable", network),
          preserve: [
            t("session.switchNetworkChain", network),
            t("session.walletChanged"),
          ],
        }),
      );
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    setPending(true);
    setActionError("");
    try {
      await organizationApi.logout();
      clearSession();
      router.refresh();
    } catch (error) {
      setActionError(
        errorMessage(error, {
          fallback: t("ui.error.requestFailed"),
          rpcUnavailable: t("tx.error.rpcUnavailable", network),
        }),
      );
    } finally {
      setPending(false);
    }
  }

  if (!isConnected || !address) return null;
  const sessionWallet = session.session?.walletAddress;
  const displayWallet = sessionWallet ? getAddress(sessionWallet) : address;
  const walletMatches = session.walletMatches;

  return (
    <div className={compact ? "space-y-1 text-right" : "space-y-2"}>
      {session.isAuthenticated && walletMatches ? (
        <>
          <p className="text-xs font-medium text-primary">
            {t("session.enabled")}
          </p>
          {!compact && (
            <p className="font-mono text-xs text-muted-foreground">
              {displayWallet.slice(0, 6)}…{displayWallet.slice(-4)}
            </p>
          )}
          <button
            type="button"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
            onClick={() => void logout()}
            disabled={pending}
          >
            {pending ? t("session.signingOut") : t("session.signOut")}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {session.isAuthenticated && !walletMatches
              ? t("session.walletChanged")
              : t("session.required")}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void signIn()}
            disabled={pending || chainId !== 133}
          >
            {pending ? t("session.signingIn") : t("session.signIn")}
          </Button>
          {chainId !== 133 && (
            <p className="text-[11px] text-muted-foreground">
              {t("session.switchNetwork", network)}
            </p>
          )}
        </>
      )}
      {session.isError && (
        <p className="max-w-64 text-[11px] leading-4 text-destructive">
          {t("session.notConfigured")}
        </p>
      )}
      {actionError && (
        <p
          role="alert"
          className="max-w-64 text-[11px] leading-4 text-destructive"
        >
          {actionError}
        </p>
      )}
    </div>
  );
}
