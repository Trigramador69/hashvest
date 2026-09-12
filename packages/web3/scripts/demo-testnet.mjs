// Real testnet integration exercise. Spends testnet HSK and mints demo-only hvUSD.
// Reviewer/beneficiary keys exist only in this process and are never printed.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createWalletClient, decodeEventLog, http, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { artifactPath, deploymentPath, root } from "./paths.mjs";
import { explorer, requireTestnet, testnetChain, testnetClient } from "./testnet-client.mjs";

async function main() {
  const client = testnetClient();
  await requireTestnet(client);
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8"));
  assert.equal(deployment.chainId, 133);
  assert.ok(deployment.factory && deployment.demoToken);
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key || !/^(0x)?[a-fA-F0-9]{64}$/.test(key)) throw new Error("Configure DEPLOYER_PRIVATE_KEY for testnet demo transactions.");
  const wallet = (account) => createWalletClient({ account, chain: testnetChain, transport: http(process.env.HSK_TESTNET_RPC_URL || testnetChain.rpcUrls.default.http[0]) });
  const issuer = wallet(privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`));
  const reviewer = wallet(privateKeyToAccount(generatePrivateKey()));
  const beneficiary = wallet(privateKeyToAccount(generatePrivateKey()));
  const abi = async (name) => JSON.parse(await readFile(artifactPath(name), "utf8")).abi;
  const factoryAbi = await abi("HashVestFactory");
  const vaultAbi = await abi("GrantVault");
  const tokenAbi = await abi("DemoToken");
  const evidence = { chainId: 133, issuer: issuer.account.address, reviewer: reviewer.account.address, beneficiary: beneficiary.account.address, transactions: [], grants: {} };

  async function confirm(label, hash) {
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
    assert.equal(receipt.status, "success", `${label} reverted`);
    evidence.transactions.push({ label, hash, url: `${explorer}/tx/${hash}` });
    console.log(`${label}: ${explorer}/tx/${hash}`);
    return receipt;
  }
  async function write(signer, label, address, contractAbi, functionName, args = []) {
    await requireTestnet(client);
    const { request } = await client.simulateContract({ address, abi: contractAbi, functionName, args, account: signer.account });
    return confirm(label, await signer.writeContract(request));
  }
  const tokenRead = (functionName, args = []) => client.readContract({ address: deployment.demoToken, abi: tokenAbi, functionName, args });
  const vaultRead = (address, functionName, args = []) => client.readContract({ address, abi: vaultAbi, functionName, args });
  const gasPrice = await client.getGasPrice();
  const roleGas = gasPrice * 600_000n + parseEther("0.00001");
  assert.ok(await client.getBalance({ address: issuer.account.address }) > roleGas * 4n, "Insufficient HSK for live demo");
  for (const [role, signer] of [["reviewer", reviewer], ["beneficiary", beneficiary]]) {
    await confirm(`Fund demo ${role} gas`, await issuer.sendTransaction({ to: signer.account.address, value: roleGas }));
  }
  await write(issuer, "Mint testnet demo tokens", deployment.demoToken, tokenAbi, "faucet");
  const allocation = parseEther("100");
  await write(issuer, "Approve three demo allocations", deployment.demoToken, tokenAbi, "approve", [deployment.factory, allocation * 3n]);
  for (const [name, strategy] of [["TIME", 0], ["MILESTONE", 1], ["HYBRID", 2]]) {
    const now = (await client.getBlock()).timestamp;
    const config = {
      title: `HashVest ${name} live verification`, token: deployment.demoToken,
      beneficiary: beneficiary.account.address, reviewer: strategy === 0 ? "0x0000000000000000000000000000000000000000" : reviewer.account.address,
      totalAllocation: allocation, strategy, start: now - 120n, cliff: 30n, duration: 60n,
      eligibilityProvider: "0x0000000000000000000000000000000000000000",
    };
    const milestones = strategy === 0 ? [] : [{ title: "Prototype accepted", amount: parseEther("40") }, { title: "Delivery accepted", amount: parseEther("60") }];
    const receipt = await write(issuer, `Create fully funded ${name} grant`, deployment.factory, factoryAbi, "createGrant", [config, milestones]);
    let vault;
    for (const log of receipt.logs.filter((entry) => entry.address.toLowerCase() === deployment.factory.toLowerCase())) {
      const decoded = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "GrantCreated") vault = decoded.args.vault;
    }
    assert.ok(vault, "Factory did not emit GrantCreated");
    evidence.grants[name] = vault;
    assert.equal(await tokenRead("balanceOf", [vault]), allocation);
    assert.equal(await vaultRead(vault, "claimedAmount"), 0n);
    assert.equal(await vaultRead(vault, "issuer"), issuer.account.address);
    for (const [functionName, role] of [["getGrantsByIssuer", issuer], ["getGrantsByBeneficiary", beneficiary], ...(strategy === 0 ? [] : [["getGrantsByReviewer", reviewer]])]) {
      const grants = await client.readContract({ address: deployment.factory, abi: factoryAbi, functionName, args: [role.account.address] });
      assert.ok(grants.some((entry) => entry.toLowerCase() === vault.toLowerCase()));
    }
    const balanceBefore = await tokenRead("balanceOf", [beneficiary.account.address]);
    if (strategy !== 0) {
      assert.equal(await vaultRead(vault, "claimableAmount"), 0n);
      await write(reviewer, `${name}: reviewer approves milestone 1`, vault, vaultAbi, "approveMilestone", [0n]);
      assert.equal(await vaultRead(vault, "claimableAmount"), parseEther("40"));
      await write(beneficiary, `${name}: beneficiary claims 40 hvUSD`, vault, vaultAbi, "claim");
      assert.equal(await tokenRead("balanceOf", [beneficiary.account.address]), balanceBefore + parseEther("40"));
      assert.equal(await vaultRead(vault, "claimableAmount"), 0n);
      await write(reviewer, `${name}: reviewer approves milestone 2`, vault, vaultAbi, "approveMilestone", [1n]);
    }
    await write(beneficiary, `${name}: beneficiary claims remaining allocation`, vault, vaultAbi, "claim");
    assert.equal(await vaultRead(vault, "claimedAmount"), allocation);
    assert.equal(await vaultRead(vault, "claimableAmount"), 0n);
    assert.equal(await tokenRead("balanceOf", [vault]), 0n);
    assert.equal(await tokenRead("balanceOf", [beneficiary.account.address]), balanceBefore + allocation);
    console.log(`${name} real lifecycle verified with distinct issuer, reviewer, beneficiary.`);
  }
  // Return residual native gas while ephemeral wallets are still available.
  for (const [role, signer] of [["reviewer", reviewer], ["beneficiary", beneficiary]]) {
    const gas = await client.estimateGas({ account: signer.account.address, to: issuer.account.address, value: 1n });
    const price = (await client.getGasPrice()) * 2n;
    const balance = await client.getBalance({ address: signer.account.address });
    if (balance > gas * price) await confirm(`Return remaining ${role} gas`, await signer.sendTransaction({ to: issuer.account.address, value: balance - gas * price, gas, gasPrice: price, type: "legacy" }));
  }
  evidence.verifiedAt = new Date().toISOString();
  evidence.results = ["TIME full claim", "MILESTONE partial and final claims", "HYBRID milestone-limited partial and final claims", "Fully funded vaults", "Role discovery", "Distinct-wallet token balance changes"];
  await writeFile(resolve(root, "docs/testnet-demo.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log("Live integration passed; public transaction evidence saved in docs/testnet-demo.json. Ephemeral demo wallet keys were never persisted.");
}

main().catch((error) => {
  console.error(error.name === "AssertionError" || error.name === "Error" ? error.message : "Live demo failed. Inspect confirmed explorer transactions and RPC availability.");
  process.exitCode = 1;
});
