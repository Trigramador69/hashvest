import { describe, expect, it } from "vitest";

import {
  assertSponsoredClaimDeadline,
  parseSponsoredClaimInput,
  parseSponsorshipPolicyInput,
} from "./validation";

const address = "0x0000000000000000000000000000000000000001";
const signature = `0x${"ab".repeat(65)}`;

describe("sponsored claim validation", () => {
  it("accepts decimal strings and a strict 65-byte signature", () => {
    expect(
      parseSponsoredClaimInput({
        amount: "100",
        nonce: "0",
        deadline: "1200",
        relayerAddress: address,
        signature,
      }),
    ).toMatchObject({ amount: 100n, nonce: 0n, relayerAddress: address });
  });

  it("rejects browser numbers, zero amounts, and malformed signatures", () => {
    expect(() =>
      parseSponsoredClaimInput({
        amount: 100,
        nonce: "0",
        deadline: "1200",
        relayerAddress: address,
        signature,
      }),
    ).toThrow("Amount must be an unsigned decimal string");
    expect(() =>
      parseSponsoredClaimInput({
        amount: "0",
        nonce: "0",
        deadline: "1200",
        relayerAddress: address,
        signature,
      }),
    ).toThrow("greater than zero");
    expect(() =>
      parseSponsoredClaimInput({
        amount: "100",
        nonce: "0",
        deadline: "1200",
        relayerAddress: address,
        signature: "0x1234",
      }),
    ).toThrow("65-byte");
  });

  it("bounds signature deadlines and organization claim limits", () => {
    expect(() => assertSponsoredClaimDeadline(1_001n, 1_000n)).not.toThrow();
    expect(() => assertSponsoredClaimDeadline(1_001n, 1_001n)).toThrow(
      "expired",
    );
    expect(() => assertSponsoredClaimDeadline(2_000n, 1_000n)).toThrow(
      "too far",
    );
    expect(
      parseSponsorshipPolicyInput({ enabled: true, maxClaims: 3 }),
    ).toEqual({ enabled: true, maxClaims: 3 });
    expect(() =>
      parseSponsorshipPolicyInput({ enabled: true, maxClaims: 10_001 }),
    ).toThrow("10000");
  });
});
