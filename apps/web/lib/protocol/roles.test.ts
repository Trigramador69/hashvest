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

  it("resolves isReviewer for any reviewer in a quorum grant", () => {
    const rev1 = "0x0000000000000000000000000000000000000010";
    const rev2 = "0x0000000000000000000000000000000000000020";
    const rev3 = "0x0000000000000000000000000000000000000030";

    const grant = {
      issuer,
      beneficiary,
      reviewer: rev1,
      reviewers: [rev1, rev2, rev3],
    };

    expect(resolveProtocolRoles(rev2, grant)).toEqual({
      isIssuer: false,
      isBeneficiary: false,
      isReviewer: true,
      roles: ["Reviewer"],
    });

    expect(resolveProtocolRoles(rev3.toUpperCase(), grant)).toEqual({
      isIssuer: false,
      isBeneficiary: false,
      isReviewer: true,
      roles: ["Reviewer"],
    });

    expect(resolveProtocolRoles(outsider, grant)).toEqual({
      isIssuer: false,
      isBeneficiary: false,
      isReviewer: false,
      roles: [],
    });
  });
});
