import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRehearsalFixture } from "./rehearsal-fixture.mjs";

const address = (lastByte) => `0x${String(lastByte).padStart(40, "0")}`;

function fixture() {
  return {
    wallets: {
      issuer: {
        label: "Issuer / workspace owner",
        address: address(1),
      },
      reviewer: {
        label: "Treasury Reviewer",
        address: address(2),
      },
      beneficiary: {
        label: "Builder",
        address: address(3),
      },
    },
    grant: {
      strategy: "HYBRID",
      allocation: "100",
      cliffSeconds: 0,
      durationSeconds: 300,
      milestones: [
        { title: "Prototype accepted", amount: "40" },
        { title: "Delivery accepted", amount: "60" },
      ],
    },
  };
}

test("accepts a complete address-only HYBRID rehearsal fixture", () => {
  const parsed = parseRehearsalFixture(fixture());

  assert.equal(parsed.wallets.issuer.address, address(1));
  assert.equal(parsed.wallets.reviewer.address, address(2));
  assert.equal(parsed.wallets.beneficiary.address, address(3));
  assert.equal(parsed.grant.allocationBaseUnits, 100n * 10n ** 18n);
  assert.deepEqual(
    parsed.grant.milestones.map((milestone) => milestone.amountBaseUnits),
    [40n * 10n ** 18n, 60n * 10n ** 18n],
  );
});

for (const [name, mutate] of [
  [
    "an invalid address",
    (input) => {
      input.wallets.reviewer.address = "not-an-address";
    },
  ],
  [
    "a zero address",
    (input) => {
      input.wallets.reviewer.address = address(0);
    },
  ],
  [
    "duplicate wallet roles",
    (input) => {
      input.wallets.reviewer.address = input.wallets.issuer.address;
    },
  ],
  [
    "milestones that do not fund the allocation",
    (input) => {
      input.grant.milestones[1].amount = "59";
    },
  ],
  [
    "a cliff longer than the duration",
    (input) => {
      input.grant.cliffSeconds = 301;
    },
  ],
  [
    "a non-HYBRID strategy",
    (input) => {
      input.grant.strategy = "TIME";
    },
  ],
  [
    "a non-rehearsal grant schedule",
    (input) => {
      input.grant.durationSeconds = 600;
    },
  ],
]) {
  test(`rejects ${name}`, () => {
    const input = fixture();
    mutate(input);
    assert.throws(() => parseRehearsalFixture(input));
  });
}

test("rejects sensitive or unsupported fixture fields", () => {
  const input = fixture();
  input.wallets.issuer.privateKey = "0xnot-for-a-fixture";

  assert.throws(
    () => parseRehearsalFixture(input),
    /public addresses and rehearsal settings only/i,
  );
});

test("rejects fixture-controlled wallet labels", () => {
  const input = fixture();
  input.wallets.issuer.label = `0x${"11".repeat(32)}`;

  assert.throws(() => parseRehearsalFixture(input));
});
