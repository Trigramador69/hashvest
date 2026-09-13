import "server-only";

import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { hskTestnet } from "@hashvest/web3";

import { ServerConfigurationError } from "@/lib/cloud/supabase-server";

export class SponsoredRelayerConfigurationError extends ServerConfigurationError {
  constructor(message: string) {
    super(message);
    this.name = "SponsoredRelayerConfigurationError";
  }
}

function relayerPrivateKey(): Hex {
  const value = process.env.SPONSORED_CLAIM_RELAYER_PRIVATE_KEY?.trim();
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value))
    throw new SponsoredRelayerConfigurationError(
      "Sponsored claims are not configured on this server. Set a funded HSK relayer key.",
    );
  return value as Hex;
}

function rpcUrl() {
  return (
    process.env.HSK_TESTNET_RPC_URL?.trim() ||
    hskTestnet.rpcUrls.default.http[0]
  );
}

export function getSponsoredRelayer() {
  const account = privateKeyToAccount(relayerPrivateKey());
  const walletClient = createWalletClient({
    account,
    chain: hskTestnet,
    transport: http(rpcUrl()),
  });
  return { account, walletClient };
}

export function getSponsoredRelayerAddress() {
  return getSponsoredRelayer().account.address;
}
