"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import { Notice } from "@/components/grant-ui";
import { SessionControl } from "@/components/session-control";
import { useSession } from "@/hooks/use-session";

export function WorkspaceAccessNotice() {
  const { isConnected, chainId } = useAccount();
  const session = useSession();
  if (!isConnected)
    return (
      <Notice title="Connect a wallet to open a workspace">
        <p>
          Workspace access uses a one-time wallet signature. No email account is
          required.
        </p>
        <div className="mt-4">
          <ConnectButton showBalance={false} />
        </div>
      </Notice>
    );
  if (chainId !== 133)
    return (
      <Notice title="Switch to HSK Testnet before signing in">
        <p>HashVest workspace sessions are bound to chain 133.</p>
      </Notice>
    );
  if (session.isError)
    return (
      <Notice title="Workspace authentication is not configured" error>
        <p>
          Set the server-only authentication secret and Supabase service role
          key, then restart the app.
        </p>
      </Notice>
    );
  if (!session.walletMatches)
    return (
      <Notice
        title={
          session.isAuthenticated
            ? "Wallet changed"
            : "Sign in to your HashVest workspace"
        }
      >
        <p>
          {session.isAuthenticated
            ? "Your current wallet differs from the authenticated workspace session. Sign in again before managing organization data."
            : "One signature enables off-chain organization context. It does not authorize blockchain actions."}
        </p>
        <div className="mt-4">
          <SessionControl />
        </div>
      </Notice>
    );
  return null;
}
