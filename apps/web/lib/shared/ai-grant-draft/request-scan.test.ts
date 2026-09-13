import { describe, expect, it } from "vitest";

import { scanRequest } from "./request-scan";

const ADDRESS = "0x3227B70F1d0dC5d9a1C4dE1A4a1a1C4dE1A4a1a1";

describe("scanRequest", () => {
  it("says nothing about an ordinary request", () => {
    expect(scanRequest("Six month grant for a developer, 500 tokens")).toEqual(
      [],
    );
  });

  it("reports a wallet address it will not use", () => {
    expect(scanRequest(`Pay ${ADDRESS} monthly`)).toEqual([
      "requestAddressIgnored",
    ]);
  });

  it("reports a secret separately from an address", () => {
    expect(scanRequest(`key 0x${"ab".repeat(32)}`)).toEqual([
      "requestSecretIgnored",
    ]);
  });

  it("reports an instruction to move value", () => {
    for (const prompt of [
      "and sign the transaction",
      "transfer the tokens now",
      "revoke the old grant",
      "firmá la transacción",
      "然后转账",
    ])
      expect(scanRequest(prompt)).toContain("requestActionIgnored");
  });

  it("leaves the product's own vocabulary alone", () => {
    // A reviewer approving and a beneficiary claiming are what a grant *is*.
    // Flagging them would bury the real warnings under noise; the guarantee
    // that a draft performs neither is stated unconditionally in the UI.
    for (const prompt of [
      "a reviewer approves each milestone before anything unlocks",
      "the beneficiary can claim after the cliff",
      "fund it fully at creation",
    ])
      expect(scanRequest(prompt)).toEqual([]);
  });

  it("returns codes in a stable order so a response is deterministic", () => {
    const prompt = `send to ${ADDRESS} with key 0x${"cd".repeat(32)}`;
    expect(scanRequest(prompt)).toEqual([
      "requestAddressIgnored",
      "requestSecretIgnored",
      "requestActionIgnored",
    ]);
  });
});
