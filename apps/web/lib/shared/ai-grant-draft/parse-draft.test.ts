import { describe, expect, it } from "vitest";

import { InvalidAiDraftError, parseAiGrantDraft } from "./parse-draft";

const ADDRESS = "0x3227B70F1d0dC5d9a1C4dE1A4a1a1C4dE1A4a1a1";

const wellFormed = {
  strategy: 2,
  title: "Ecosystem grant",
  description: "Hybrid grant for a long-term partner.",
  allocation: "800",
  timing: {
    unit: "60",
    cliff: "1",
    duration: "6",
    realWorldNote: "One minute per year.",
  },
  milestones: [
    { title: "Onboarding", percentOfAllocation: 40 },
    { title: "Sustained contribution", percentOfAllocation: 60 },
  ],
  assumptions: ["Both conditions apply."],
  unsupported: [],
};

describe("parseAiGrantDraft", () => {
  it("reads a well-formed payload without reporting anything", () => {
    const result = parseAiGrantDraft(wellFormed);
    expect(result.draft.strategy).toBe(2);
    expect(result.draft.allocation).toBe("800");
    expect(result.draft.timing).toEqual(wellFormed.timing);
    expect(result.draft.milestones).toHaveLength(2);
    expect(result.droppedFields).toEqual([]);
    expect(result.redactions).toEqual([]);
  });

  it("accepts the raw JSON text a provider put in a message body", () => {
    const result = parseAiGrantDraft(JSON.stringify(wellFormed));
    expect(result.draft.title).toBe("Ecosystem grant");
  });

  it("rejects text that is not JSON", () => {
    expect(() => parseAiGrantDraft("Sure! Here is your grant:")).toThrow(
      InvalidAiDraftError,
    );
  });

  it("rejects a payload that is not an object", () => {
    for (const payload of [null, 42, ["grant"], true])
      expect(() => parseAiGrantDraft(payload)).toThrow(InvalidAiDraftError);
  });

  it("drops every field a grant template has no place for, by name", () => {
    const result = parseAiGrantDraft({
      ...wellFormed,
      beneficiary: ADDRESS,
      reviewer: ADDRESS,
      token: ADDRESS,
      start: "2026-01-01T00:00:00Z",
      revocable: true,
      eligibilityProvider: ADDRESS,
    });
    expect(result.droppedFields).toEqual([
      "beneficiary",
      "reviewer",
      "token",
      "start",
      "revocable",
      "eligibilityProvider",
    ]);
    // The draft type has no home for them, so they cannot survive the parse.
    expect(JSON.stringify(result.draft)).not.toContain(ADDRESS);
    expect(JSON.stringify(result.draft)).not.toContain("2026-01-01");
  });

  it("reports a nested field it dropped with its path", () => {
    const result = parseAiGrantDraft({
      ...wellFormed,
      timing: { ...wellFormed.timing, startsAt: 12 },
      milestones: [{ title: "Ship", percentOfAllocation: 100, payTo: ADDRESS }],
    });
    expect(result.droppedFields).toEqual([
      "timing.startsAt",
      "milestones[0].payTo",
    ]);
  });

  it("redacts an address a model wrote into prose", () => {
    const result = parseAiGrantDraft({
      ...wellFormed,
      title: `Grant for ${ADDRESS}`,
      assumptions: [`Pays ${ADDRESS} monthly.`],
    });
    expect(result.draft.title).toBe("Grant for [redacted]");
    expect(result.draft.assumptions).toEqual(["Pays [redacted] monthly."]);
    expect(result.redactions).toEqual(["address"]);
  });

  it("coerces the string/number confusion providers actually produce", () => {
    const result = parseAiGrantDraft({
      ...wellFormed,
      strategy: "2",
      allocation: 800,
      timing: { ...wellFormed.timing, unit: 60, cliff: 1, duration: 6 },
      milestones: [
        { title: "Onboarding", percentOfAllocation: "40" },
        { title: "Delivery", percentOfAllocation: "60" },
      ],
    });
    expect(result.draft.strategy).toBe(2);
    expect(result.draft.allocation).toBe("800");
    expect(result.draft.timing).toMatchObject({
      unit: "60",
      cliff: "1",
      duration: "6",
    });
    expect(result.draft.milestones?.[0].percentOfAllocation).toBe(40);
  });

  it("strips thousands separators from an allocation", () => {
    expect(
      parseAiGrantDraft({ ...wellFormed, allocation: "20,000" }).draft
        .allocation,
    ).toBe("20000");
  });

  it("rejects a draft with no usable strategy, title, or amount", () => {
    expect(() => parseAiGrantDraft({ ...wellFormed, strategy: 7 })).toThrow(
      "unlock strategy",
    );
    expect(() => parseAiGrantDraft({ ...wellFormed, title: "   " })).toThrow(
      "no title",
    );
    expect(() =>
      parseAiGrantDraft({ ...wellFormed, allocation: "a lot" }),
    ).toThrow("token amount");
  });

  it("rejects a schedule unit the wizard cannot select", () => {
    expect(() =>
      parseAiGrantDraft({
        ...wellFormed,
        timing: { ...wellFormed.timing, unit: "2592000" },
      }),
    ).toThrow("schedule unit");
  });

  it("rejects a milestone with no usable percentage", () => {
    expect(() =>
      parseAiGrantDraft({
        ...wellFormed,
        milestones: [{ title: "Ship", percentOfAllocation: 0 }],
      }),
    ).toThrow("percentage");
    expect(() =>
      parseAiGrantDraft({
        ...wellFormed,
        milestones: [{ title: "Ship", percentOfAllocation: 12.5 }],
      }),
    ).toThrow("percentage");
  });

  it("clamps oversized prose instead of failing on it", () => {
    const result = parseAiGrantDraft({
      ...wellFormed,
      title: "t".repeat(500),
      assumptions: Array.from(
        { length: 40 },
        (_, index) => `assumption ${index}`,
      ),
    });
    expect(result.draft.title).toHaveLength(120);
    expect(result.draft.assumptions).toHaveLength(6);
  });

  it("treats an empty milestone list as none at all", () => {
    expect(
      parseAiGrantDraft({ ...wellFormed, milestones: [] }).draft.milestones,
    ).toBeNull();
  });
});
