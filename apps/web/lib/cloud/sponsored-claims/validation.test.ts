import { describe, expect, it } from "vitest";

import {
  assertSponsoredActionDeadline,
  parseSponsoredActionInput,
  parseSponsorshipPolicyInput,
} from "./validation";

const address = "0x0000000000000000000000000000000000000001";
const secondAddress = "0x0000000000000000000000000000000000000002";
const signature = `0x${"ab".repeat(65)}`;

describe("sponsored action validation", () => {
  it("accepts strict claim and review intent payloads", () => {
    expect(
      parseSponsoredActionInput({
        actionType: "claim",
        amount: "100",
        nonce: "0",
        deadline: "1200",
        relayerAddress: address,
        signature,
      }),
    ).toMatchObject({ actionType: "claim", amount: 100n, nonce: 0n });
    expect(
      parseSponsoredActionInput({
        actionType: "review",
        milestoneIndex: 2,
        nonce: "7",
        deadline: "1200",
        relayerAddress: address,
        signature,
      }),
    ).toMatchObject({ actionType: "review", milestoneIndex: 2, nonce: 7n });
  });

  it("rejects ambiguous action payloads and malformed signatures", () => {
    expect(() =>
      parseSponsoredActionInput({
        actionType: "claim",
        amount: 100,
        nonce: "0",
        deadline: "1200",
        relayerAddress: address,
        signature,
      }),
    ).toThrow("Amount must be an unsigned decimal string");
    expect(() =>
      parseSponsoredActionInput({
        actionType: "review",
        milestoneIndex: 20,
        nonce: "0",
        deadline: "1200",
        relayerAddress: address,
        signature,
      }),
    ).toThrow("0 to 19");
    expect(() =>
      parseSponsoredActionInput({
        actionType: "claim",
        amount: "100",
        nonce: "0",
        deadline: "1200",
        relayerAddress: address,
        signature: "0x1234",
      }),
    ).toThrow("65-byte");
  });

  it("bounds deadlines and requires an explicit safe policy", () => {
    expect(() => assertSponsoredActionDeadline(1_001n, 1_000n)).not.toThrow();
    expect(() => assertSponsoredActionDeadline(1_001n, 1_001n)).toThrow(
      "expired",
    );
    expect(() => assertSponsoredActionDeadline(2_000n, 1_000n)).toThrow(
      "too far",
    );
    expect(
      parseSponsorshipPolicyInput({
        enabled: true,
        allowedActions: ["claim", "review"],
        allowedVaults: [address, address, secondAddress],
        maxActions: 3,
        maxActionsPerWalletPerDay: 2,
        maxGasBudgetWei: "1000000000000000",
      }),
    ).toMatchObject({
      allowedActions: ["claim", "review"],
      allowedVaults: [address, secondAddress],
      maxGasBudgetWei: 1_000_000_000_000_000n,
    });
    expect(() =>
      parseSponsorshipPolicyInput({
        enabled: true,
        allowedActions: ["claim"],
        allowedVaults: [],
        maxActions: 3,
        maxActionsPerWalletPerDay: 2,
        maxGasBudgetWei: "1",
      }),
    ).toThrow("at least one allowed vault");
    expect(() =>
      parseSponsorshipPolicyInput({
        enabled: true,
        allowedActions: ["claim"],
        allowedVaults: [address],
        maxActions: 10_001,
        maxActionsPerWalletPerDay: 2,
        maxGasBudgetWei: "1",
      }),
    ).toThrow("10000");
  });
});
