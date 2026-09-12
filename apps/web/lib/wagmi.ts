import { getDefaultConfig } from "@rainbow-me/rainbowkit";

import { hskChains } from "@hashvest/web3";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "hashvest-development-placeholder";

export const wagmiConfig = getDefaultConfig({
  appName: "HSK Development Environment",
  projectId: walletConnectProjectId,
  chains: hskChains,
  ssr: true,
});
