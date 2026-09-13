import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import { safeMilestoneEvidenceHref } from "../../shared/milestone-evidence";
import {
  normalizeWalletAddress,
  parseMilestoneEvidenceInput,
  parseMilestoneIndex,
  parseNotificationReadInput,
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

  it("stores a grant preset key as optional template metadata", () => {
    expect(
      parseOrganizationGrantInput({
        chainId: 133,
        vaultAddress: wallet,
        templateKey: "ecosystem-grant",
      }),
    ).toMatchObject({ templateKey: "ecosystem-grant" });
    // A custom/blank grant carries no preset.
    expect(
      parseOrganizationGrantInput({
        chainId: 133,
        vaultAddress: wallet,
        templateKey: null,
      }),
    ).toMatchObject({ templateKey: null });
  });

  it("accepts the supported milestone evidence types and safe URLs", () => {
    expect(
      parseMilestoneEvidenceInput({
        evidenceUrl: "  https://github.com/hashvest/hashvest/pull/15  ",
        evidenceType: "github_pr",
        note: "  Review-ready implementation.  ",
      }),
    ).toEqual({
      evidenceUrl: "https://github.com/hashvest/hashvest/pull/15",
      evidenceType: "github_pr",
      note: "Review-ready implementation.",
    });
    expect(
      parseMilestoneEvidenceInput({
        evidenceUrl: "ipfs://bafybeigdyrzt5example/readme",
        evidenceType: "ipfs",
      }),
    ).toEqual({
      evidenceUrl: "ipfs://bafybeigdyrzt5example/readme",
      evidenceType: "ipfs",
      note: null,
    });
  });

  it("rejects unsafe or unsupported evidence input", () => {
    for (const input of [
      { evidenceUrl: "javascript:alert(1)", evidenceType: "document" },
      { evidenceUrl: "data:text/html,unsafe", evidenceType: "document" },
      {
        evidenceUrl: "https://user:password@example.com/evidence",
        evidenceType: "document",
      },
      { evidenceUrl: "http://example.com/evidence", evidenceType: "document" },
      { evidenceUrl: "https://example.com/evidence", evidenceType: "unknown" },
      { evidenceUrl: "ipfs://bafybeigdyrzt5example", evidenceType: "document" },
      { evidenceUrl: "https://", evidenceType: "document" },
      { evidenceUrl: "https://.", evidenceType: "document" },
      { evidenceUrl: "https://..", evidenceType: "document" },
    ]) {
      expect(() => parseMilestoneEvidenceInput(input)).toThrow();
    }
    expect(
      parseMilestoneEvidenceInput({
        evidenceUrl: "https://gateway.example/ipfs/bafybeigdyrzt5example",
        evidenceType: "ipfs",
      }),
    ).toMatchObject({ evidenceType: "ipfs" });
  });

  it("ignores a submitter wallet or approval fields sent in the body", () => {
    expect(
      parseMilestoneEvidenceInput({
        evidenceUrl: "https://example.com/evidence",
        evidenceType: "document",
        note: "Delivery note",
        submittedByWallet: wallet,
        reviewer: wallet,
        beneficiary: wallet,
        approved: true,
        allocation: "1000",
      }),
    ).toEqual({
      evidenceUrl: "https://example.com/evidence",
      evidenceType: "document",
      note: "Delivery note",
    });
  });

  it("never returns an unsafe href for rendering", () => {
    expect(
      safeMilestoneEvidenceHref(
        "https://github.com/hashvest/hashvest/pull/15",
        "github_pr",
      ),
    ).toBe("https://github.com/hashvest/hashvest/pull/15");
    expect(
      safeMilestoneEvidenceHref("ipfs://bafybeigdyrzt5example", "ipfs"),
    ).toBe("ipfs://bafybeigdyrzt5example");
    for (const [url, type] of [
      ["javascript:alert(1)", "document"],
      ["data:text/html,unsafe", "document"],
      ["http://example.com/evidence", "document"],
      ["https://user:password@example.com/evidence", "document"],
      ["ipfs://bafybeigdyrzt5example", "document"],
      ["https://.", "document"],
    ] as const) {
      expect(safeMilestoneEvidenceHref(url, type)).toBeNull();
    }
  });

  it("rejects malformed milestone indexes", () => {
    expect(parseMilestoneIndex("0")).toBe(0);
    expect(parseMilestoneIndex("19")).toBe(19);
    for (const value of ["-1", "1.5", "", "1e2", "999999999999999999999"]) {
      expect(() => parseMilestoneIndex(value)).toThrow();
    }
  });

  it("accepts notification keys that belong to the vault they name", () => {
    const vaultAddress = "0x00000000000000000000000000000000000000aa";
    expect(
      parseNotificationReadInput({
        reads: [
          {
            notificationKey: `${vaultAddress}:milestone-pending:0`,
            vaultAddress,
          },
          { notificationKey: `${vaultAddress}:claimable`, vaultAddress },
        ],
      }),
    ).toEqual([
      {
        notificationKey: `${vaultAddress}:milestone-pending:0`,
        vaultAddress,
      },
      { notificationKey: `${vaultAddress}:claimable`, vaultAddress },
    ]);
    expect(parseNotificationReadInput({ reads: [] })).toEqual([]);
  });

  it("rejects a notification key that does not name its own vault", () => {
    const vaultAddress = "0x00000000000000000000000000000000000000aa";
    const other = "0x00000000000000000000000000000000000000bb";
    for (const reads of [
      [{ notificationKey: `${other}:claimable`, vaultAddress }],
      [{ notificationKey: "claimable", vaultAddress }],
      [{ notificationKey: "", vaultAddress }],
      [{ notificationKey: `${vaultAddress}:claimable`, vaultAddress: "0x01" }],
    ]) {
      expect(() => parseNotificationReadInput({ reads })).toThrow();
    }
    expect(() => parseNotificationReadInput({})).toThrow();
    expect(() => parseNotificationReadInput(null)).toThrow();
  });
});
