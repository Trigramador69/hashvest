import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { encodeAbiParameters } from "viem";
import { contractsDirectory, deploymentPath } from "./paths.mjs";
import { explorer, requireTestnet, testnetClient } from "./testnet-client.mjs";

async function main() {
  await requireTestnet(testnetClient());
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8"));
  if (deployment.chainId !== 133 || !deployment.deployer) throw new Error("Missing HSK Testnet deployment.");
  for (const [name, field] of [["HashVestFactory", "factory"], ["DemoToken", "demoToken"], ["DemoEligibilityProvider", "eligibilityProvider"]]) {
    const args = ["verify-contract", deployment[field], `src/${name}.sol:${name}`, "--chain", "133", "--verifier", "blockscout", "--verifier-url", `${explorer}/api/`, "--watch"];
    if (name !== "HashVestFactory") args.push("--constructor-args", encodeAbiParameters([{ type: "address" }], [deployment.deployer]));
    const result = spawnSync("forge", args, { cwd: contractsDirectory, stdio: "inherit", timeout: 90_000 });
    if (result.status !== 0) throw new Error(`Verification of ${name} did not finish. Retry pnpm contracts:verify:testnet; deployment is unaffected.`);
  }
}

main().catch((error) => {
  console.error(error.name === "Error" ? error.message : "Verification RPC unavailable; deployment is unaffected.");
  process.exitCode = 1;
});
