import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const root = fileURLToPath(new URL("../../../", import.meta.url));
export const contractsDirectory = resolve(root, "packages/contracts");
export const artifactPath = (name) =>
  resolve(contractsDirectory, "out", `${name}.sol`, `${name}.json`);
export const deploymentPath = resolve(root, "packages/web3/src/addresses/hsk-testnet.json");
export const broadcastPath = resolve(contractsDirectory, "broadcast/DeployHashVest.s.sol/133/run-latest.json");
