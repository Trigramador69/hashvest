import { describe, expect, it } from "vitest";

import { InvalidPresetError } from "./apply-preset";
import {
  applyOrganizationTemplateToDraft,
  assertValidOrganizationTemplate,
  type OrganizationTemplateContent,
  type OrganizationTemplateDefinition,
} from "./organization-template";
import { parseTemplateKey } from "./template-key";

const MEMBER_ID = "3b7c2d1e-8f4a-4c5b-9d6e-1a2b3c4d5e6f";

const TIME: OrganizationTemplateContent = {
  name: "Core team vesting",
  description: "Four-year vesting with a one-year cliff.",
  strategy: 0,
  schedule: { unitSeconds: 86400, cliffUnits: 365, durationUnits: 1460 },
  milestones: null,
  allocationSuggestion: "12000",
  defaultReviewerMemberId: null,
};

const MILESTONE: OrganizationTemplateContent = {
  name: "Builder grant",
  description: null,
  strategy: 1,
  schedule: null,
  milestones: [
    { title: "Design", percentOfAllocation: 25 },
    { title: "Launch", percentOfAllocation: 75 },
  ],
  allocationSuggestion: null,
  defaultReviewerMemberId: MEMBER_ID,
};

const HYBRID: OrganizationTemplateContent = {
  name: "Ecosystem partner",
  description: null,
  strategy: 2,
  schedule: { unitSeconds: 3600, cliffUnits: 0, durationUnits: 720 },
  milestones: [
    { title: "Integration", percentOfAllocation: 40 },
    { title: "Sustained contribution", percentOfAllocation: 60 },
  ],
  allocationSuggestion: "1000.5",
  defaultReviewerMemberId: MEMBER_ID,
};

function stored(
  content: OrganizationTemplateContent,
  version = 1,
): OrganizationTemplateDefinition {
  return { ...content, id: "9d1e4b2a-7c3f-4a8e-9b21-5f6c0d3ac2a4", version };
}

function expectInvalid(
  patch: Partial<OrganizationTemplateContent>,
  base = HYBRID,
) {
  expect(() => assertValidOrganizationTemplate({ ...base, ...patch })).toThrow(
    InvalidPresetError,
  );
}

describe("assertValidOrganizationTemplate", () => {
  it("accepts a valid template for every strategy", () => {
    for (const template of [TIME, MILESTONE, HYBRID]) {
      expect(() => assertValidOrganizationTemplate(template)).not.toThrow();
    }
  });

  it("rejects strategy and schedule combinations the protocol cannot accept", () => {
    expectInvalid({ schedule: null }, TIME);
    expectInvalid({ schedule: null }, HYBRID);
    expectInvalid(
      { schedule: { unitSeconds: 60, cliffUnits: 0, durationUnits: 5 } },
      MILESTONE,
    );
    expectInvalid({ strategy: 3 as 0 });
  });

  it("rejects strategy and milestone combinations the protocol cannot accept", () => {
    expectInvalid(
      { milestones: [{ title: "x", percentOfAllocation: 100 }] },
      TIME,
    );
    expectInvalid({ milestones: null }, MILESTONE);
    expectInvalid({ milestones: null }, HYBRID);
    expectInvalid({ milestones: [] });
    expectInvalid({
      milestones: Array.from({ length: 21 }, (_, index) => ({
        title: `m${index}`,
        percentOfAllocation: index === 0 ? 80 : 1,
      })),
    });
  });

  it("rejects milestone splits that do not cover exactly the allocation", () => {
    expectInvalid({
      milestones: [
        { title: "a", percentOfAllocation: 40 },
        { title: "b", percentOfAllocation: 50 },
      ],
    });
    expectInvalid({
      milestones: [
        { title: "a", percentOfAllocation: 40.5 },
        { title: "b", percentOfAllocation: 59.5 },
      ],
    });
    expectInvalid({
      milestones: [
        { title: "a", percentOfAllocation: 0 },
        { title: "b", percentOfAllocation: 100 },
      ],
    });
  });

  it("rejects milestone titles the wizard would not accept", () => {
    expectInvalid({ milestones: [{ title: "", percentOfAllocation: 100 }] });
    expectInvalid({
      milestones: [{ title: " padded ", percentOfAllocation: 100 }],
    });
    expectInvalid({
      milestones: [{ title: "t".repeat(121), percentOfAllocation: 100 }],
    });
  });

  it("rejects out-of-range schedules", () => {
    expectInvalid({
      schedule: { unitSeconds: 120 as 60, cliffUnits: 0, durationUnits: 5 },
    });
    expectInvalid({
      schedule: { unitSeconds: 60, cliffUnits: 0, durationUnits: 0 },
    });
    expectInvalid({
      schedule: { unitSeconds: 60, cliffUnits: 6, durationUnits: 5 },
    });
    expectInvalid({
      schedule: { unitSeconds: 60, cliffUnits: -1, durationUnits: 5 },
    });
    expectInvalid({
      schedule: { unitSeconds: 60, cliffUnits: 0, durationUnits: 1.5 },
    });
    expectInvalid({
      schedule: {
        unitSeconds: 60,
        cliffUnits: 0,
        durationUnits: 2_147_483_648,
      },
    });
  });

  it("never lets a time vesting template carry a reviewer default", () => {
    expectInvalid({ defaultReviewerMemberId: MEMBER_ID }, TIME);
  });

  it("rejects stored text outside the column limits", () => {
    expectInvalid({ name: "" });
    expectInvalid({ name: " Padded " });
    expectInvalid({ name: "n".repeat(81) });
    expectInvalid({ description: "" });
    expectInvalid({ description: "d".repeat(1001) });
  });

  it("accepts only a positive decimal allocation suggestion", () => {
    for (const allocationSuggestion of [
      "0",
      "0.000",
      "-5",
      "1e3",
      "12abc",
      "1.",
      "9".repeat(79),
    ]) {
      expectInvalid({ allocationSuggestion });
    }
    expect(() =>
      assertValidOrganizationTemplate({
        ...HYBRID,
        allocationSuggestion: "0.5",
      }),
    ).not.toThrow();
  });
});

describe("applyOrganizationTemplateToDraft", () => {
  it("fills the wizard the same way a global preset does", () => {
    const applied = applyOrganizationTemplateToDraft(stored(HYBRID, 4), {
      decimals: 18,
    });
    expect(applied.draft).toEqual({
      title: "Ecosystem partner",
      description: "",
      allocation: "1000.5",
      strategy: 2,
      unit: "3600",
      cliff: "0",
      duration: "720",
      milestones: [
        { title: "Integration", amount: "400.2" },
        { title: "Sustained contribution", amount: "600.3" },
      ],
      reviewerRequired: true,
    });
    expect(applied.defaultReviewerMemberId).toBe(MEMBER_ID);
  });

  it("records a template key that parses back to this template and version", () => {
    const template = stored(MILESTONE, 7);
    const { templateKey } = applyOrganizationTemplateToDraft(template);
    expect(parseTemplateKey(templateKey)).toEqual({
      kind: "organization",
      templateId: template.id,
      version: 7,
    });
  });

  it("is idempotent when re-applied to its own result", () => {
    for (const content of [TIME, MILESTONE, HYBRID]) {
      const template = stored(content);
      const first = applyOrganizationTemplateToDraft(template, { decimals: 6 });
      const second = applyOrganizationTemplateToDraft(template, {
        decimals: 6,
        title: first.draft.title,
        allocationDecimal: first.draft.allocation,
      });
      expect(second).toEqual(first);
    }
  });

  it("keeps a title and allocation the user already typed", () => {
    const { draft } = applyOrganizationTemplateToDraft(stored(MILESTONE), {
      title: "Q3 builder grant",
      allocationDecimal: "200",
      decimals: 18,
    });
    expect(draft.title).toBe("Q3 builder grant");
    expect(draft.allocation).toBe("200");
    expect(draft.milestones.map((milestone) => milestone.amount)).toEqual([
      "50",
      "150",
    ]);
  });

  it("leaves amounts blank rather than inventing them when no allocation exists", () => {
    const { draft } = applyOrganizationTemplateToDraft(stored(MILESTONE));
    expect(draft.allocation).toBe("");
    expect(draft.milestones.map((milestone) => milestone.amount)).toEqual([
      "",
      "",
    ]);
  });

  it("never produces an address or an amount the user or template did not supply", () => {
    const { draft } = applyOrganizationTemplateToDraft(stored(TIME));
    expect(JSON.stringify(draft)).not.toMatch(/0x[0-9a-fA-F]{40}/);
    expect(draft.reviewerRequired).toBe(false);
    expect(draft.milestones).toEqual([]);
  });

  it("refuses a stored template that is invalid instead of filling the wizard", () => {
    // A rule the shared preset mapping also enforces.
    expect(() =>
      applyOrganizationTemplateToDraft(
        stored({
          ...HYBRID,
          milestones: [{ title: "Only half", percentOfAllocation: 50 }],
        }),
      ),
    ).toThrow(InvalidPresetError);
    // Rules only templates have. The preset mapping alone would accept these
    // and hand the wizard a time vesting grant with a suggested reviewer.
    expect(() =>
      applyOrganizationTemplateToDraft(
        stored({ ...TIME, defaultReviewerMemberId: MEMBER_ID }),
      ),
    ).toThrow(InvalidPresetError);
    expect(() =>
      applyOrganizationTemplateToDraft(
        stored({ ...HYBRID, allocationSuggestion: "0" }),
      ),
    ).toThrow(InvalidPresetError);
  });
});
