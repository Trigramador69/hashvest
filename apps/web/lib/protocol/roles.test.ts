import { describe, expect, it } from "vitest";

import { findMemberByWallet } from "../cloud/members";
import { resolveProtocolRoles } from "./roles";

const issuer = "0x0000000000000000000000000000000000000001";
const beneficiary = "0x0000000000000000000000000000000000000002";
const reviewer = "0x0000000000000000000000000000000000000003";
const outsider = "0x0000000000000000000000000000000000000004";

describe("protocol role resolution", () => {
  it("keeps onchain roles independent from organization membership", () => {
    expect(
      resolveProtocolRoles(beneficiary.toUpperCase(), {
        issuer,
        beneficiary,
        reviewer,
      }),
    ).toEqual({
      isIssuer: false,
      isBeneficiary: true,
      isReviewer: false,
      roles: ["Beneficiary"],
    });
  });

  it("can resolve multiple protocol roles for one wallet", () => {
    expect(
      resolveProtocolRoles(issuer, {
        issuer,
        beneficiary: issuer,
        reviewer,
      }).roles,
    ).toEqual(["Issuer", "Beneficiary"]);
  });

  it("grants no protocol role from a presentation role label", () => {
    const members = [
      { walletAddress: outsider, roleLabel: "Treasury Reviewer" },
    ];
    expect(findMemberByWallet(members, outsider)?.roleLabel).toBe(
      "Treasury Reviewer",
    );
    expect(
      resolveProtocolRoles(outsider, { issuer, beneficiary, reviewer }),
    ).toEqual({
      isIssuer: false,
      isBeneficiary: false,
      isReviewer: false,
      roles: [],
    });
  });
});
