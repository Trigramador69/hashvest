import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { encodeDeployData, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { artifactPath, contractsDirectory, root } from "./paths.mjs";
import { requireTestnet, testnetClient } from "./testnet-client.mjs";

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error || result.status !== 0)
    throw new Error(`${command} failed; deployment pipeline stopped.`);
}

async function main() {
  // A key is inherited through the environment, never placed in CLI arguments.
  const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!rawKey || !/^(0x)?[a-fA-F0-9]{64}$/.test(rawKey))
    throw new Error(
      "Configure a valid DEPLOYER_PRIVATE_KEY in packages/contracts/.env.",
    );
  const normalizedKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`);
  process.env.DEPLOYER_PRIVATE_KEY = normalizedKey;
  let account;
  try {
    account = privateKeyToAccount(normalizedKey);
  } catch {
    throw new Error("DEPLOYER_PRIVATE_KEY is invalid.");
  }

  const client = testnetClient();
  await requireTestnet(client);
  const balance = await client.getBalance({ address: account.address });
  console.log(
    `HSK Testnet (133), deployer ${account.address}, balance ${formatEther(balance)} HSK`,
  );
  if (balance === 0n)
    throw new Error("Deployer needs testnet HSK before deployment.");
  run("forge", ["build"], contractsDirectory);
  run("forge", ["test"], contractsDirectory);
  run("node", ["packages/web3/scripts/sync-contracts.mjs"]);

  const gasPrice = await client.getGasPrice();
  let gasEstimate = 0n;
  for (const name of [
    "HashVestFactory",
    "DemoToken",
    "DemoEligibilityProvider",
  ]) {
    const artifact = JSON.parse(await readFile(artifactPath(name), "utf8"));
    const data = encodeDeployData({
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
      args: name === "HashVestFactory" ? [] : [account.address],
    });
    gasEstimate += await client.estimateGas({ account: account.address, data });
  }
  const budget = (gasEstimate * gasPrice * 150n) / 100n;
  console.log(
    `Estimated deployment budget with 50% buffer: ${formatEther(budget)} HSK`,
  );
  if (balance < budget)
    throw new Error(
      "Insufficient testnet HSK for the estimated deployment budget.",
    );
  await requireTestnet(client);
  run(
    "forge",
    [
      "script",
      "script/DeployHashVest.s.sol:DeployHashVest",
      "--rpc-url",
      "hsk_testnet",
      "--broadcast",
    ],
    contractsDirectory,
  );
  run("node", ["packages/web3/scripts/sync-contracts.mjs", "--addresses"]);
  run("node", ["packages/web3/scripts/smoke-testnet.mjs"]);
}

main().catch((error) => {
  // RPC failures can contain sensitive endpoint URLs. Keep terminal output safe.
  const safe =
    error.name === "Error"
      ? error.message
      : "RPC preflight/deployment failed. Check RPC availability and testnet balance.";
  console.error(safe);
  process.exitCode = 1;
});
