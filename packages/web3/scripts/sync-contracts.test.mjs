import assert from "node:assert/strict";
import { test } from "node:test";
import { deploymentFromBroadcast } from "./sync-contracts.mjs";

function broadcast() {
  const names = ["HashVestFactory", "DemoToken", "DemoEligibilityProvider"];
  return {
    chain: 133,
    transactions: names.map((contractName, i) => ({
      contractName,
      transactionType: "CREATE",
      contractAddress: `0x${String(i + 1).padStart(40, "0")}`,
      hash: `0x${String(i + 1).padStart(64, "0")}`,
      transaction: { chainId: "0x85", from: `0x${"a".repeat(40)}` },
    })),
    receipts: names.map((_, i) => ({
      transactionHash: `0x${String(i + 1).padStart(64, "0")}`,
      contractAddress: `0x${String(i + 1).padStart(40, "0")}`,
      status: "0x1",
      blockNumber: "0x10",
    })),
  };
}

test("exports only confirmed contracts with deterministic public deployment data", () => {
  const output = deploymentFromBroadcast(broadcast());
  assert.equal(output.chainId, 133);
  assert.equal(output.factory, "0x0000000000000000000000000000000000000001");
  assert.equal(output.demoToken, "0x0000000000000000000000000000000000000002");
  assert.equal(
    output.eligibilityProvider,
    "0x0000000000000000000000000000000000000003",
  );
  assert.equal(output.blockNumbers.factory, 16);
  assert.deepEqual(output, deploymentFromBroadcast(broadcast()));
});

for (const [name, mutate] of [
  [
    "mainnet broadcast",
    (b) => {
      b.chain = 177;
    },
  ],
  [
    "wrong-chain transaction",
    (b) => {
      b.transactions[1].transaction.chainId = "0xb1";
    },
  ],
  [
    "reverted deployment",
    (b) => {
      b.receipts[1].status = "0x0";
    },
  ],
  [
    "missing receipt",
    (b) => {
      b.receipts.pop();
    },
  ],
  [
    "missing contract",
    (b) => {
      b.transactions.pop();
    },
  ],
  [
    "duplicate deployment",
    (b) => {
      b.transactions.push(b.transactions[0]);
    },
  ],
  [
    "mismatched receipt",
    (b) => {
      b.receipts[0].contractAddress = b.receipts[1].contractAddress;
    },
  ],
  [
    "inconsistent deployer",
    (b) => {
      b.transactions[0].transaction.from = `0x${"b".repeat(40)}`;
    },
  ],
  [
    "zero deployed address",
    (b) => {
      b.transactions[0].contractAddress = `0x${"0".repeat(40)}`;
      b.receipts[0].contractAddress = b.transactions[0].contractAddress;
    },
  ],
]) {
  test(`rejects ${name}`, () => {
    const input = broadcast();
    mutate(input);
    assert.throws(() => deploymentFromBroadcast(input));
  });
}
