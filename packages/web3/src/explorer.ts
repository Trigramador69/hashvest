import type { Address, Hash } from "viem";
import { hskTestnet } from "./chains/hsk";

export function addressExplorerUrl(address: Address): string {
  return `${hskTestnet.blockExplorers.default.url}/address/${address}`;
}

export function transactionExplorerUrl(hash: Hash): string {
  return `${hskTestnet.blockExplorers.default.url}/tx/${hash}`;
}
