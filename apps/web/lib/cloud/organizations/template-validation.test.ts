import { describe, expect, it } from "vitest";

import {
  InputValidationError,
  parseOrganizationTemplateInput,
  parseTemplateVersion,
} from "./validation";

const REVIEWER = "c1c1c1c1-0000-4000-8000-0000000000c1";

const HYBRID_INPUT = {
  name: "  Ecosystem partner  ",
  description: "  Time and delivery.  ",
  strategy: 2,
  schedule: { unitSeconds: 86400, cliffUnits: 30, durationUnits: 365 },
  milestones: [
    { title: "  Integration ", percentOfAllocation: 40 },
    { title: "Sustained contribution", percentOfAllocation: 60 },
  ],
  allocationSuggestion: " 800 ",
  defaultReviewerMemberId: REVIEWER,
};

function expectRejected(input: unknown) {
  expect(() => parseOrganizationTemplateInput(input)).toThrow(
    InputValidationError,
  );
}

describe("parseOrganizationTemplateInput", () => {
  it("parses and trims a valid template", () => {
    expect(parseOrganizationTemplateInput(HYBRID_INPUT)).toEqual({
      name: "Ecosystem partner",
      description: "Time and delivery.",
      strategy: 2,
      schedule: { unitSeconds: 86400, cliffUnits: 30, durationUnits: 365 },
      milestones: [
        { title: "Integration", percentOfAllocation: 40 },
        { title: "Sustained contribution", percentOfAllocation: 60 },
      ],
      allocationSuggestion: "800",
      defaultReviewerMemberId: REVIEWER,
    });
  });

  it("drops every field outside the design instead of storing it", () => {
    const parsed = parseOrganizationTemplateInput({
      ...HYBRID_INPUT,
      beneficiary: "0x00000000000000000000000000000000000000ff",
      reviewer: "0x00000000000000000000000000000000000000ee",
      token: "0x00000000000000000000000000000000000000dd",
      vaultAddress: "0x00000000000000000000000000000000000000cc",
      totalAllocation: "1000",
      claimedAmount: "10",
      organizationId: "0b0b0b0b-0000-4000-8000-00000000000b",
      createdByWallet: "0x00000000000000000000000000000000000000bb",
      version: 99,
    });
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "allocationSuggestion",
        "defaultReviewerMemberId",
        "description",
        "milestones",
        "name",
        "schedule",
        "strategy",
      ].sort(),
    );
  });

  it("treats absent optional fields as null", () => {
    const parsed = parseOrganizationTemplateInput({
      name: "Advisor vesting",
      strategy: 0,
      schedule: { unitSeconds: 60, cliffUnits: 0, durationUnits: 3 },
    });
    expect(parsed).toMatchObject({
      description: null,
      milestones: null,
      allocationSuggestion: null,
      defaultReviewerMemberId: null,
    });
  });

  it("rejects payloads that are not a template object", () => {
    for (const input of [null, undefined, "template", 42, []]) {
      expectRejected(input);
    }
  });

  it("requires exact types instead of coercing strings", () => {
    expectRejected({ ...HYBRID_INPUT, strategy: "2" });
    expectRejected({
      ...HYBRID_INPUT,
      schedule: { unitSeconds: "86400", cliffUnits: 30, durationUnits: 365 },
    });
    expectRejected({ ...HYBRID_INPUT, milestones: "Integration" });
    expectRejected({
      ...HYBRID_INPUT,
      milestones: [{ title: "Integration", percentOfAllocation: "100" }],
    });
  });

  it("rejects invalid strategy and milestone combinations before any write", () => {
    expectRejected({ ...HYBRID_INPUT, milestones: null });
    expectRejected({ ...HYBRID_INPUT, schedule: null });
    expectRejected({ ...HYBRID_INPUT, strategy: 1 });
    expectRejected({
      ...HYBRID_INPUT,
      strategy: 0,
      milestones: null,
    });
  });

  it("returns the shared rule's message without its internal label", () => {
    expect(() =>
      parseOrganizationTemplateInput({
        ...HYBRID_INPUT,
        milestones: [{ title: "Half", percentOfAllocation: 50 }],
      }),
    ).toThrow(/^milestone percentages must add up to 100, got 50\.$/);
  });

  it("rejects a malformed reviewer default", () => {
    expectRejected({ ...HYBRID_INPUT, defaultReviewerMemberId: "reviewer" });
    expectRejected({
      ...HYBRID_INPUT,
      defaultReviewerMemberId: "0x00000000000000000000000000000000000000ee",
    });
  });
});

describe("parseTemplateVersion", () => {
  it("accepts a positive whole number", () => {
    expect(parseTemplateVersion(1)).toBe(1);
    expect(parseTemplateVersion(2_147_483_647)).toBe(2_147_483_647);
  });

  it("rejects anything else", () => {
    for (const value of [0, -1, 1.5, "2", null, undefined, 2_147_483_648]) {
      expect(() => parseTemplateVersion(value)).toThrow(InputValidationError);
    }
  });
});
