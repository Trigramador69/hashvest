import { describe, expect, it } from "vitest";

import { isSessionWalletMatch, isValidSessionClaims } from "./session-utils";

const wallet = "0x0000000000000000000000000000000000000001";

describe("workspace session utilities", () => {
  it("only treats the same wallet as an authenticated workspace match", () => {
    expect(isSessionWalletMatch(wallet, wallet.toUpperCase())).toBe(true);
    expect(
      isSessionWalletMatch(
        wallet,
        "0x0000000000000000000000000000000000000002",
      ),
    ).toBe(false);
    expect(isSessionWalletMatch(wallet, undefined)).toBe(false);
  });

  it("requires an EVM subject bound to HSK Testnet", () => {
    expect(isValidSessionClaims({ sub: wallet, chainId: 133 })).toBe(true);
    expect(isValidSessionClaims({ sub: wallet, chainId: 1 })).toBe(false);
    expect(isValidSessionClaims({ sub: "not-an-address", chainId: 133 })).toBe(
      false,
    );
  });
});
