import type { Address } from "viem";

export const developmentRegistryAddresses = {
  hskMainnet: undefined,
  hskTestnet: undefined,
} satisfies Record<"hskMainnet" | "hskTestnet", Address | undefined>;
