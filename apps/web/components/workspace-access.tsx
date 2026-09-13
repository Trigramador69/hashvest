"use client";

import { useAccount } from "wagmi";

import { Notice } from "@/components/grant-ui";
import { RainbowConnectButton } from "@/components/rainbow-connect-button";
import { SessionControl } from "@/components/session-control";
import { useSession } from "@/hooks/use-session";
import { useTranslations } from "@/lib/shared/i18n/provider";
import { hskTestnet } from "@hashvest/web3";

/** Protocol literals: never translated, only interpolated. */
const NETWORK = { network: hskTestnet.name, chainId: hskTestnet.id };

export function WorkspaceAccessNotice() {
  const { isConnected, chainId } = useAccount();
  const session = useSession();
  const t = useTranslations();
  if (!isConnected)
    return (
      <Notice title={t("access.connect.title")}>
        <p>{t("access.connect.body")}</p>
        <div className="mt-4">
          <RainbowConnectButton />
        </div>
      </Notice>
    );
  if (chainId !== 133)
    return (
      <Notice title={t("access.network.title", NETWORK)}>
        <p>{t("access.network.body", NETWORK)}</p>
      </Notice>
    );
  if (session.isError)
    return (
      <Notice title={t("access.notConfigured.title")} error>
        <p>{t("access.notConfigured.body")}</p>
      </Notice>
    );
  if (!session.walletMatches)
    return (
      <Notice
        title={
          session.isAuthenticated
            ? t("access.walletChanged.title")
            : t("access.signIn.title")
        }
      >
        <p>
          {session.isAuthenticated
            ? t("access.walletChanged.body")
            : t("access.signIn.body")}
        </p>
        <div className="mt-4">
          <SessionControl />
        </div>
      </Notice>
    );
  return null;
}
