import { numberToHex, type AddEthereumChainParameter } from "viem";
import { hskTestnet } from "@hashvest/web3";

export type BrowserProvider = {
  request(args: {
    method: string;
    params?: readonly unknown[];
  }): Promise<unknown>;
};

export const hskTestnetAddChainParameter = {
  chainId: numberToHex(hskTestnet.id),
  chainName: hskTestnet.name,
  nativeCurrency: hskTestnet.nativeCurrency,
  rpcUrls: [...hskTestnet.rpcUrls.default.http],
  blockExplorerUrls: [hskTestnet.blockExplorers.default.url],
} as const satisfies AddEthereumChainParameter;

export const hskTestnetSwitchParameter = {
  chainName: hskTestnetAddChainParameter.chainName,
  nativeCurrency: hskTestnetAddChainParameter.nativeCurrency,
  rpcUrls: hskTestnetAddChainParameter.rpcUrls,
  blockExplorerUrls: hskTestnetAddChainParameter.blockExplorerUrls,
} as const;

export function isBrowserProvider(value: unknown): value is BrowserProvider {
  return Boolean(
    value &&
    typeof value === "object" &&
    "request" in value &&
    typeof value.request === "function",
  );
}

export async function probeWalletRpc(provider: BrowserProvider) {
  await provider.request({
    method: "eth_getBlockByNumber",
    params: ["latest", false],
  });
}
