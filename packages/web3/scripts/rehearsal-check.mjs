import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  erc20Abi,
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  parseEther,
} from "viem";
import { deploymentPath, root } from "./paths.mjs";
import { parseRehearsalFixture } from "./rehearsal-fixture.mjs";
import { explorer, requireTestnet, testnetClient } from "./testnet-client.mjs";

const defaultFixturePath = resolve(root, "docs/testnet-rehearsal.local.json");

function fixturePath() {
  return resolve(
    process.cwd(),
    process.env.REHEARSAL_FIXTURE || defaultFixturePath,
  );
}

async function readJson(path, { missingMessage, invalidMessage }) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(missingMessage);
    throw new Error(invalidMessage);
  }
}

function safeErrorMessage(error) {
  const message =
    error instanceof Error ? error.message : "Rehearsal check failed.";
  return message
    .replace(/(?:https?|wss?):\/\/[^\s)]+/gi, "<rpc endpoint>")
    .replace(/\b(?:0x)?[a-f0-9]{64}\b/gi, "<redacted hex value>");
}

async function main() {
  if (process.argv[2] === "--help") {
    console.log(
      "Usage: REHEARSAL_FIXTURE=path pnpm rehearsal:check\nReads public wallet addresses only; it never loads or prints private keys and never sends transactions.",
    );
    return;
  }
  if (process.argv[2] && process.argv[2] !== "--check")
    throw new Error("Usage: rehearsal-check.mjs [--check|--help]");

  const fixture = parseRehearsalFixture(
    await readJson(fixturePath(), {
      missingMessage:
        "No local rehearsal fixture. Copy docs/testnet-rehearsal.example.json to docs/testnet-rehearsal.local.json and fill public addresses only.",
      invalidMessage: "The local rehearsal fixture is not valid JSON.",
    }),
  );
  const deployment = await readJson(deploymentPath, {
    missingMessage:
      "No synchronized HSK Testnet deployment. Run pnpm contracts:sync:addresses after a confirmed deployment.",
    invalidMessage: "The synchronized HSK deployment is not valid JSON.",
  });
  if (deployment.chainId !== 133)
    throw new Error(
      "The synchronized deployment must target HSK Testnet chain 133.",
    );
  if (
    typeof deployment.factory !== "string" ||
    typeof deployment.demoToken !== "string" ||
    !isAddress(deployment.factory) ||
    !isAddress(deployment.demoToken)
  )
    throw new Error(
      "The synchronized HSK Testnet factory and demo token are required.",
    );

  const client = testnetClient();
  await requireTestnet(client);
  for (const [label, address] of [
    ["HashVestFactory", deployment.factory],
    ["DemoToken", deployment.demoToken],
  ]) {
    const code = await client.getCode({ address });
    if (!code || code === "0x") throw new Error(`No bytecode at ${label}.`);
  }

  const token = getAddress(deployment.demoToken);
  const [symbol, decimals] = await Promise.all([
    client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);
  if (symbol !== "hvUSD" || decimals !== 18)
    throw new Error(
      "The synchronized demo token must be hvUSD with 18 decimals.",
    );

  const gasPrice = await client.getGasPrice();
  const gasPerBrowserTransaction = gasPrice * 600_000n + parseEther("0.00001");
  const transactionsByRole = {
    issuer: 3n,
    reviewer: 2n,
    beneficiary: 2n,
  };
  const walletEntries = Object.entries(fixture.wallets);
  const balances = await Promise.all(
    walletEntries.map(async ([role, wallet]) => {
      const [nativeBalance, tokenBalance] = await Promise.all([
        client.getBalance({ address: wallet.address }),
        client.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [wallet.address],
        }),
      ]);
      const requiredNativeBalance =
        gasPerBrowserTransaction * transactionsByRole[role];
      if (nativeBalance < requiredNativeBalance)
        throw new Error(
          `${role} wallet needs at least ${formatEther(requiredNativeBalance)} HSK for its browser transactions at the current gas price.`,
        );
      return { role, ...wallet, nativeBalance, tokenBalance };
    }),
  );
  const issuer = balances.find(({ role }) => role === "issuer");
  if (!issuer || issuer.tokenBalance < fixture.grant.allocationBaseUnits)
    throw new Error(
      `Issuer wallet needs at least ${fixture.grant.allocation} ${symbol} before creating the grant.`,
    );

  console.log(
    "HSK Testnet browser rehearsal is ready for a manual wallet run.",
  );
  console.log("Network: HSK Testnet · chain 133 · https://testnet.hsk.xyz");
  console.log(`Factory: ${explorer}/address/${deployment.factory}`);
  console.log(`Token: ${explorer}/address/${deployment.demoToken} · ${symbol}`);
  for (const { role, address, nativeBalance, tokenBalance } of balances)
    console.log(
      `${role}: ${address} · ${formatEther(nativeBalance)} HSK · ${formatUnits(tokenBalance, decimals)} ${symbol}`,
    );
  console.log(
    `HYBRID grant: ${fixture.grant.allocation} ${symbol} · ${fixture.grant.durationSeconds}s duration · ${fixture.grant.milestones.map((milestone) => `${milestone.amount} ${symbol}`).join(" + ")}`,
  );
  console.log(
    "No private keys were read or printed. No transactions were sent by this command.",
  );
}

main().catch((error) => {
  console.error(safeErrorMessage(error));
  console.error("No transactions were sent by this command.");
  process.exitCode = 1;
});
