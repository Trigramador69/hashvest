import { describe, expect, it } from "vitest";

import {
  readFactorySponsorshipSupport,
  sponsoredGrantSelector,
} from "./factory-capabilities";

describe("factory sponsorship support (HAS-48)", () => {
  it("derives a four-byte selector from the generated ABI", () => {
    // Derived, never hardcoded: a signature change must move the check with it.
    expect(sponsoredGrantSelector).toMatch(/^0x[0-9a-f]{8}$/);
  });

  it("does not guess from a read it never got", () => {
    // The checked-in deployment question is exactly the one where a wrong guess
    // is expensive: an unread factory must not be reported as either.
    expect(readFactorySponsorshipSupport(undefined)).toBe("unknown");
    expect(readFactorySponsorshipSupport(null)).toBe("unknown");
    expect(readFactorySponsorshipSupport("0x")).toBe("unknown");
  });

  it("reports a dispatcher carrying the selector as supported", () => {
    const bytecode =
      `0x6080604052${sponsoredGrantSelector.slice(2)}5b00` as const;
    expect(readFactorySponsorshipSupport(bytecode)).toBe("supported");
  });

  it("matches the selector regardless of the case the node returns", () => {
    const upper =
      `0x6080604052${sponsoredGrantSelector.slice(2).toUpperCase()}5B00` as const;
    expect(readFactorySponsorshipSupport(upper)).toBe("supported");
  });

  it("reports a factory without the selector as unsupported", () => {
    // A pre-HAS-28 factory: real bytecode, no sponsored entry point.
    expect(
      readFactorySponsorshipSupport("0x6080604052348015600f57600080fd"),
    ).toBe("unsupported");
  });
});
