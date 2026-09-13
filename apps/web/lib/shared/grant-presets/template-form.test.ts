import { describe, expect, it } from "vitest";

import {
  assertValidOrganizationTemplate,
  type OrganizationTemplateContent,
} from "./organization-template";
import {
  BLANK_TEMPLATE_FORM,
  milestonePercentTotal,
  templateForm,
  templateFormIssues,
  templateFormToContent,
  type TemplateForm,
} from "./template-form";

const MEMBER_ID = "3b7c2d1e-8f4a-4c5b-9d6e-1a2b3c4d5e6f";

const HYBRID: OrganizationTemplateContent = {
  name: "Ecosystem partner",
  description: "Integration work, reviewed as it lands.",
  strategy: 2,
  schedule: { unitSeconds: 3600, cliffUnits: 0, durationUnits: 720 },
  milestones: [
    { title: "Integration", percentOfAllocation: 40 },
    { title: "Sustained contribution", percentOfAllocation: 60 },
  ],
  allocationSuggestion: "1000.5",
  defaultReviewerMemberId: MEMBER_ID,
};

function form(patch: Partial<TemplateForm> = {}): TemplateForm {
  return {
    ...templateForm({ ...HYBRID, id: MEMBER_ID, version: 1 }),
    ...patch,
  };
}

const keys = (state: TemplateForm) =>
  templateFormIssues(state).map((issue) => issue.key);

describe("loading and saving a template", () => {
  it("round-trips stored content unchanged", () => {
    const stored = { ...HYBRID, id: MEMBER_ID, version: 3 };
    expect(templateFormToContent(templateForm(stored))).toEqual(HYBRID);
  });

  it("offers a valid blank template to start from", () => {
    expect(keys(BLANK_TEMPLATE_FORM)).toEqual(["templates.error.name"]);
    const named = { ...BLANK_TEMPLATE_FORM, name: "Core team vesting" };
    expect(keys(named)).toEqual([]);
    expect(() =>
      assertValidOrganizationTemplate(templateFormToContent(named)),
    ).not.toThrow();
  });

  it("keeps only what the chosen strategy uses", () => {
    // Switching to milestones drops a schedule the reader had filled in.
    const milestone = templateFormToContent(form({ strategy: 1 }));
    expect(milestone.schedule).toBeNull();
    expect(milestone.milestones).toHaveLength(2);

    // Time vesting has no milestones and never keeps a reviewer default: the
    // vault records the zero address as reviewer.
    const time = templateFormToContent(form({ strategy: 0 }));
    expect(time.milestones).toBeNull();
    expect(time.defaultReviewerMemberId).toBeNull();
    expect(time.schedule).toEqual(HYBRID.schedule);
  });

  it("trims text and treats empty optional fields as absent", () => {
    const content = templateFormToContent(
      form({
        name: "  Partner grant  ",
        description: "   ",
        allocationSuggestion: "  ",
        defaultReviewerMemberId: "",
        milestones: [
          { title: "  Integration  ", percent: " 40 " },
          { title: "Adoption", percent: "60" },
        ],
      }),
    );
    expect(content.name).toBe("Partner grant");
    expect(content.description).toBeNull();
    expect(content.allocationSuggestion).toBeNull();
    expect(content.defaultReviewerMemberId).toBeNull();
    expect(content.milestones?.[0]).toEqual({
      title: "Integration",
      percentOfAllocation: 40,
    });
  });

  it("produces content the shared rules accept, for every strategy", () => {
    for (const strategy of [0, 1, 2] as const) {
      const content = templateFormToContent(form({ strategy }));
      expect(() => assertValidOrganizationTemplate(content)).not.toThrow();
    }
  });
});

describe("what the editor refuses to save", () => {
  it("requires a name within the stored limit", () => {
    expect(keys(form({ name: "   " }))).toEqual(["templates.error.name"]);
    expect(keys(form({ name: "n".repeat(81) }))).toEqual([
      "templates.error.name",
    ]);
    expect(keys(form({ description: "d".repeat(1001) }))).toEqual([
      "templates.error.description",
    ]);
  });

  it("requires a schedule the protocol can accept", () => {
    expect(keys(form({ duration: "0" }))).toEqual(["templates.error.duration"]);
    expect(keys(form({ duration: "1.5" }))).toEqual([
      "templates.error.duration",
    ]);
    expect(keys(form({ cliff: "-1" }))).toEqual(["templates.error.cliff"]);
    expect(keys(form({ cliff: "800", duration: "720" }))).toEqual([
      "templates.error.cliffTooLong",
    ]);
    // Milestone grants have no schedule at all, so its values cannot fail.
    expect(keys(form({ strategy: 1, duration: "0", cliff: "x" }))).toEqual([]);
  });

  it("requires milestone shares that add up to exactly 100", () => {
    const issue = templateFormIssues(
      form({
        milestones: [
          { title: "Integration", percent: "40" },
          { title: "Adoption", percent: "50" },
        ],
      }),
    );
    expect(issue).toEqual([
      { key: "templates.error.percentSum", values: { total: 90 } },
    ]);
    expect(
      keys(form({ milestones: [{ title: "All of it", percent: "100" }] })),
    ).toEqual([]);
  });

  it("names the milestone row that is wrong", () => {
    expect(
      templateFormIssues(
        form({
          milestones: [
            { title: "Integration", percent: "40" },
            { title: "  ", percent: "0" },
            { title: "Adoption", percent: "60" },
          ],
        }),
      ),
    ).toEqual([
      { key: "templates.error.milestoneTitle", values: { index: 2, max: 120 } },
      { key: "templates.error.percent", values: { index: 2 } },
    ]);
  });

  it("counts only numeric shares in the running total", () => {
    expect(
      milestonePercentTotal([
        { title: "a", percent: "40" },
        { title: "b", percent: "" },
        { title: "c", percent: "sixty" },
      ]),
    ).toBe(40);
  });

  it("accepts only a positive decimal allocation suggestion", () => {
    for (const allocation of ["0", "0.00", "-5", "1,5", "1e3"]) {
      expect(keys(form({ allocationSuggestion: allocation }))).toEqual([
        "templates.error.allocation",
      ]);
    }
    for (const allocation of ["", "  ", "1000", "0.5"]) {
      expect(keys(form({ allocationSuggestion: allocation }))).toEqual([]);
    }
  });

  it("reports every problem at once rather than one per attempt", () => {
    expect(
      keys(
        form({
          name: "",
          duration: "0",
          milestones: [{ title: "", percent: "10" }],
          allocationSuggestion: "0",
        }),
      ),
    ).toEqual([
      "templates.error.name",
      "templates.error.duration",
      "templates.error.milestoneTitle",
      "templates.error.percentSum",
      "templates.error.allocation",
    ]);
  });
});
