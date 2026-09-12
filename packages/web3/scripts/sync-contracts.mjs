import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";
import { getAddress, isAddress, isHash, zeroAddress } from "viem";
import { artifactPath, broadcastPath, deploymentPath, root } from "./paths.mjs";

const contracts = [
  ["HashVestFactory", "hashVestFactoryAbi"],
  ["GrantVault", "grantVaultAbi"],
  ["DemoToken", "demoTokenAbi"],
  ["DemoEligibilityProvider", "demoEligibilityProviderAbi"],
  ["IEligibilityProvider", "eligibilityProviderAbi"],
];

export async function generateAbis() {
  const exports = await Promise.all(
    contracts.map(async ([name, exportName]) => {
      const artifact = JSON.parse(await readFile(artifactPath(name), "utf8"));
      if (!Array.isArray(artifact.abi))
        throw new Error(`Missing ABI for ${name}`);
      return `export const ${exportName} = ${JSON.stringify(artifact.abi)} as const;`;
    }),
  );
  return format(
    `// Generated from Foundry artifacts by pnpm contracts:sync. Do not edit.\n${exports.join("\n\n")}\n`,
    { parser: "typescript" },
  );
}

/** Reject partial, reverted, wrong-chain, and ambiguous deployment broadcasts. */
export function deploymentFromBroadcast(broadcast) {
  if (Number(broadcast.chain) !== 133) throw new Error("Expected chain ID 133");
  const result = { chainId: 133 };
  const transactionHashes = {};
  const blockNumbers = {};
  let deployer;
  for (const [name, field] of [
    ["HashVestFactory", "factory"],
    ["DemoToken", "demoToken"],
    ["DemoEligibilityProvider", "eligibilityProvider"],
  ]) {
    const matches = broadcast.transactions?.filter(
      (tx) => tx.contractName === name && tx.transactionType === "CREATE",
    );
    if (matches?.length !== 1)
      throw new Error(`Expected one ${name} deployment`);
    const tx = matches[0];
    if (
      !isHash(tx.hash) ||
      !isAddress(tx.contractAddress) ||
      tx.contractAddress === zeroAddress
    )
      throw new Error(`Invalid ${name} deployment data`);
    if (
      tx.transaction?.chainId != null &&
      Number(tx.transaction.chainId) !== 133
    )
      throw new Error(`Wrong-chain transaction for ${name}`);
    const receipt = broadcast.receipts?.find(
      (entry) => entry.transactionHash?.toLowerCase() === tx.hash.toLowerCase(),
    );
    if (
      !receipt ||
      !(Number(receipt.status) === 1 || receipt.status === "success") ||
      receipt.contractAddress?.toLowerCase() !==
        tx.contractAddress.toLowerCase()
    )
      throw new Error(`Missing successful ${name} receipt`);
    if (!isAddress(tx.transaction.from)) throw new Error("Missing deployer");
    const sender = getAddress(tx.transaction.from);
    if (deployer && sender !== deployer)
      throw new Error("Inconsistent deployer");
    deployer = sender;
    result[field] = getAddress(tx.contractAddress);
    transactionHashes[field] = tx.hash;
    blockNumbers[field] = Number(BigInt(receipt.blockNumber));
  }
  return { ...result, deployer, transactionHashes, blockNumbers };
}

async function main() {
  const mode = process.argv[2];
  if (mode && mode !== "--check" && mode !== "--addresses")
    throw new Error("Usage: sync-contracts.mjs [--check|--addresses]");
  if (mode === "--addresses") {
    const deployment = deploymentFromBroadcast(
      JSON.parse(await readFile(broadcastPath, "utf8")),
    );
    await writeFile(
      deploymentPath,
      await format(JSON.stringify(deployment), { parser: "json" }),
    );
    console.log("HSK Testnet addresses synchronized:", deployment);
    return;
  }
  const output = await generateAbis();
  const target = resolve(root, "packages/web3/src/abis/generated.ts");
  if (mode === "--check") {
    if ((await readFile(target, "utf8")) !== output)
      throw new Error("Generated ABIs are stale. Run pnpm contracts:sync.");
    console.log("Generated ABIs match Foundry artifacts.");
  } else {
    await writeFile(target, output);
    console.log("Synchronized five contract ABIs.");
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
