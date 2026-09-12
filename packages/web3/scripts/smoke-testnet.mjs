import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { artifactPath, deploymentPath } from "./paths.mjs";
import { explorer, requireTestnet, testnetClient } from "./testnet-client.mjs";

async function main() {
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8"));
  assert.equal(deployment.chainId, 133, "Deployment must target chain 133");
  const client = testnetClient();
  await requireTestnet(client);
  for (const field of ["factory", "demoToken", "eligibilityProvider"]) {
    assert.ok(deployment[field], `No deployed ${field}. Run pnpm contracts:deploy:testnet.`);
    const code = await client.getCode({ address: deployment[field] });
    assert.ok(code && code !== "0x", `No bytecode at ${field}`);
    const receipt = await client.getTransactionReceipt({ hash: deployment.transactionHashes[field] });
    assert.equal(receipt.status, "success", `${field} deployment reverted`);
    assert.equal(receipt.contractAddress.toLowerCase(), deployment[field].toLowerCase());
    console.log(`${field}: bytecode + receipt OK · ${explorer}/address/${deployment[field]}`);
  }
  const abi = async (name) => JSON.parse(await readFile(artifactPath(name), "utf8")).abi;
  const token = { address: deployment.demoToken, abi: await abi("DemoToken") };
  assert.equal(await client.readContract({ ...token, functionName: "symbol" }), "hvUSD");
  assert.equal(await client.readContract({ ...token, functionName: "decimals" }), 18);
  assert.ok((await client.readContract({ ...token, functionName: "totalSupply" })) >= 1_000_000n * 10n ** 18n);
  const owner = await client.readContract({ address: deployment.eligibilityProvider, abi: await abi("DemoEligibilityProvider"), functionName: "owner" });
  assert.equal(owner.toLowerCase(), deployment.deployer.toLowerCase());
  for (const functionName of ["getGrantsByIssuer", "getGrantsByBeneficiary", "getGrantsByReviewer"]) {
    const grants = await client.readContract({ address: deployment.factory, abi: await abi("HashVestFactory"), functionName, args: [deployment.deployer] });
    assert.ok(Array.isArray(grants));
  }
  console.log("Read-only HSK Testnet smoke passed: chain, bytecode, deployment receipts, token metadata/supply, eligibility owner, role discovery.");
}

main().catch((error) => {
  console.error(error.name === "AssertionError" ? error.message : "Testnet smoke failed. Check deployment data and RPC availability.");
  process.exitCode = 1;
});
