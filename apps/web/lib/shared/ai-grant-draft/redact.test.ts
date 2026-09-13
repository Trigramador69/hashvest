import { describe, expect, it } from "vitest";

import { containsSensitiveValue, redactPrompt, redactText } from "./redact";

const ADDRESS = "0x3227B70F1d0dC5d9a1C4dE1A4a1a1C4dE1A4a1a1";
const HASH = `0x${"ab".repeat(32)}`;

describe("redactText", () => {
  it("leaves an ordinary request untouched", () => {
    const prompt = "Create a six-month developer grant for 200 tokens.";
    const result = redactText(prompt);
    expect(result.text).toBe(prompt);
    expect(result.findings).toEqual([]);
  });

  it("removes a wallet address and never returns it", () => {
    const result = redactText(`Pay ${ADDRESS} every month`);
    expect(result.text).not.toContain(ADDRESS);
    expect(result.text).toBe("Pay [redacted] every month");
    expect(result.findings).toEqual([{ kind: "address", count: 1 }]);
  });

  it("removes a 32-byte value before the address pattern can claim its prefix", () => {
    const result = redactText(`See ${HASH} for proof`);
    expect(result.text).toBe("See [redacted] for proof");
    expect(result.findings).toEqual([{ kind: "secret-like", count: 1 }]);
  });

  it("removes a PEM private key block whole", () => {
    const key = [
      "-----BEGIN EC PRIVATE KEY-----",
      "MHcCAQEEIQD0000000000000000000000",
      "-----END EC PRIVATE KEY-----",
    ].join("\n");
    const result = redactText(`use ${key} please`);
    expect(result.text).toBe("use [redacted] please");
    expect(result.findings).toEqual([{ kind: "private-key", count: 1 }]);
  });

  it("removes a twelve word seed phrase", () => {
    const phrase =
      "abandon ability able about above absent absorb abstract absurd abuse access accident";
    const result = redactText(`Recover: ${phrase}.`);
    expect(result.text).toBe("Recover: [redacted].");
    expect(result.findings).toEqual([{ kind: "mnemonic", count: 1 }]);
  });

  it("swallows lowercase words adjacent to a seed phrase, by design", () => {
    // A mnemonic word is indistinguishable from a short lowercase word next to
    // it, so the run is cut generously. A false positive costs a word; a false
    // negative costs a secret.
    const phrase =
      "abandon ability able about above absent absorb abstract absurd abuse access accident";
    const result = redactText(`recover ${phrase} now`);
    expect(result.text).toBe("[redacted]");
    expect(result.findings).toEqual([{ kind: "mnemonic", count: 1 }]);
  });

  it("keeps a long ordinary sentence, because BIP39 carries no function words", () => {
    const sentence =
      "please build grant that pays team once they ship core release with final audit";
    const result = redactText(sentence);
    expect(result.text).toBe(sentence);
    expect(result.findings).toEqual([]);
  });

  it("counts repeated removals of the same kind once, with a count", () => {
    const result = redactText(`${ADDRESS} and ${ADDRESS}`);
    expect(result.findings).toEqual([{ kind: "address", count: 2 }]);
  });

  it("removes any other long hexadecimal blob", () => {
    const result = redactText("token 0xdeadbeefdeadbeef01 here");
    expect(result.text).toBe("token [redacted] here");
    expect(result.findings).toEqual([{ kind: "hex-value", count: 1 }]);
  });
});

describe("redactPrompt", () => {
  it("collapses whitespace after redacting, never before", () => {
    const result = redactPrompt(`  Fund\n\n${ADDRESS}\tmonthly  `);
    expect(result.text).toBe("Fund [redacted] monthly");
    expect(result.findings).toEqual([{ kind: "address", count: 1 }]);
  });
});

describe("containsSensitiveValue", () => {
  it("reports model prose that smuggled an address back", () => {
    expect(containsSensitiveValue(`Grant for ${ADDRESS}`)).toBe(true);
    expect(containsSensitiveValue("Builder grant")).toBe(false);
  });
});
