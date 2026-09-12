import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { hskChains } from "@hashvest/web3";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

export const wagmiConfig = getDefaultConfig({
  appName: "HashVest",
  projectId: projectId ?? "",
  // Browser wallets work without a WalletConnect project. Never use a fake ID.
  ...(projectId
    ? {}
    : {
        wallets: [{ groupName: "Browser wallets", wallets: [injectedWallet] }],
      }),
  chains: hskChains,
  ssr: true,
});
