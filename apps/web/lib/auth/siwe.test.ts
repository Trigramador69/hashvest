import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";

import {
  createSiweChallenge,
  verifySiweSignature,
  type ApplicationOrigin,
} from "./siwe-core";

const account = privateKeyToAccount(
  "0x0123456789012345678901234567890123456789012345678901234567890123",
);
const applicationOrigin: ApplicationOrigin = {
  origin: "http://localhost:3000",
  domain: "localhost:3000",
};

describe("SIWE challenge utilities", () => {
  it("verifies a signature against the exact issued EIP-4361 challenge", async () => {
    const challenge = createSiweChallenge(account.address, applicationOrigin);
    const signature = await account.signMessage({ message: challenge.message });

    await expect(
      verifySiweSignature({
        message: challenge.message,
        signature,
        expected: challenge,
        expectedMessage: challenge.message,
      }),
    ).resolves.toBe(account.address.toLowerCase());
  });

  it("rejects a message changed after the nonce was issued", async () => {
    const challenge = createSiweChallenge(account.address, applicationOrigin);
    const signature = await account.signMessage({ message: challenge.message });

    await expect(
      verifySiweSignature({
        message: `${challenge.message} changed`,
        signature,
        expected: challenge,
        expectedMessage: challenge.message,
      }),
    ).rejects.toThrow("does not match");
  });
});
