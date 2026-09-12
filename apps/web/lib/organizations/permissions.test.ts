import { describe, expect, it } from "vitest";

import { resolveProtocolRoles } from "./permissions";

const issuer = "0x0000000000000000000000000000000000000001";
const beneficiary = "0x0000000000000000000000000000000000000002";
const reviewer = "0x0000000000000000000000000000000000000003";

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
});
