import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import {
  normalizeWalletAddress,
  parseMemberInput,
  parseOrganizationGrantInput,
  parseOrganizationInput,
} from "./validation";

const wallet = "0x0000000000000000000000000000000000000001";

describe("organization input validation", () => {
  it("normalizes valid EVM addresses to lowercase storage", () => {
    expect(normalizeWalletAddress(getAddress(wallet))).toBe(wallet);
  });

  it("rejects invalid and zero addresses", () => {
    expect(() => normalizeWalletAddress("not an address")).toThrow();
    expect(() =>
      normalizeWalletAddress("0x0000000000000000000000000000000000000000"),
    ).toThrow();
  });

  it("trims organization and member presentation fields", () => {
    expect(
      parseOrganizationInput({
        name: "  HashKey Builders  ",
        displayName: "  Ana  ",
        roleLabel: "  Treasury Lead  ",
      }),
    ).toEqual({
      name: "HashKey Builders",
      displayName: "Ana",
      roleLabel: "Treasury Lead",
    });
    expect(
      parseMemberInput({ walletAddress: wallet, displayName: "Ana" }),
    ).toEqual({
      walletAddress: wallet,
      displayName: "Ana",
      roleLabel: null,
    });
  });

  it("requires the canonical HSK grant identity", () => {
    expect(() =>
      parseOrganizationGrantInput({ chainId: 1, vaultAddress: wallet }),
    ).toThrow("chain 133");
    expect(
      parseOrganizationGrantInput({ chainId: 133, vaultAddress: wallet }),
    ).toMatchObject({ chainId: 133, vaultAddress: wallet });
  });
});
