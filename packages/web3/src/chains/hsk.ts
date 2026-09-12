import { defineChain } from "viem";

export const hskMainnet = defineChain({
  id: 177,
  name: "HSK Mainnet",
  nativeCurrency: {
    name: "HSK",
    symbol: "HSK",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.hsk.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "HashKey Blockscout",
      url: "https://hashkey.blockscout.com",
    },
  },
});

export const hskTestnet = defineChain({
  id: 133,
  name: "HSK Testnet",
  nativeCurrency: {
    name: "HSK",
    symbol: "HSK",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.hsk.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "HSK Testnet Explorer",
      url: "https://testnet-explorer.hskchain.net",
    },
  },
  testnet: true,
});

/**
 * Keep Testnet first so it is the default development chain in the app.
 */
export const hskChains = [hskTestnet, hskMainnet] as const;

export type HskChain = (typeof hskChains)[number];
