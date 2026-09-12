import { createPublicClient, http } from "viem";

export const testnetChain = {
  id: 133,
  name: "HSK Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hsk.xyz"] } },
};

export const explorer = "https://testnet-explorer.hskchain.net";

export function testnetClient() {
  return createPublicClient({
    chain: testnetChain,
    transport: http(process.env.HSK_TESTNET_RPC_URL || testnetChain.rpcUrls.default.http[0], {
      timeout: 20_000,
      retryCount: 1,
    }),
  });
}

export async function requireTestnet(client) {
  if ((await client.getChainId()) !== 133) throw new Error("Aborted: HSK Testnet chain ID 133 is required.");
}
