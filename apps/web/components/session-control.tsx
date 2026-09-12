"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAddress } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import { getAccount } from "wagmi/actions";

import { Button } from "@/components/ui/button";
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
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");

  async function signIn() {
    if (!address) return;
    setPending(true);
    setActionError("");
    try {
      if (chainId !== 133)
        throw new Error("Switch your wallet to HSK Testnet (chain 133) first.");
      const requestedWallet = address.toLowerCase();
      const challenge = await organizationApi.requestNonce(address, 133);
      const signature = await signMessageAsync({ message: challenge.message });
      const currentAccount = getAccount(wagmiConfig);
      if (
        !currentAccount.address ||
        currentAccount.address.toLowerCase() !== requestedWallet
      )
        throw new Error("Wallet changed. Sign in again to continue.");
      await organizationApi.verifySignature(challenge.message, signature);
      await session.refetch();
      router.refresh();
    } catch (error) {
      setActionError(errorMessage(error));
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
      setActionError(errorMessage(error));
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
            Workspace access enabled
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
            {pending ? "Signing out…" : "Sign out of workspace"}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {session.isAuthenticated && !walletMatches
              ? "Wallet changed. Sign in again to continue."
              : "Wallet connected, workspace sign-in required."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void signIn()}
            disabled={pending || chainId !== 133}
          >
            {pending ? "Signing in…" : "Sign in to workspace"}
          </Button>
          {chainId !== 133 && (
            <p className="text-[11px] text-muted-foreground">
              Switch to HSK Testnet first.
            </p>
          )}
        </>
      )}
      {session.isError && (
        <p className="max-w-64 text-[11px] leading-4 text-destructive">
          Workspace auth is not configured on this server yet.
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
