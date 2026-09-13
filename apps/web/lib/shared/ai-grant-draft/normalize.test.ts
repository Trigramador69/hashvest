import { describe, expect, it } from "vitest";

import { assertValidPreset } from "../grant-presets/apply-preset";
import { GENERATED_PRESET_KEY } from "../grant-presets/presets";
import { normalizeAiDraft, type AiAdjustmentCode } from "./normalize";
import { InvalidAiDraftError } from "./parse-draft";
import type { AiGrantDraft } from "./schema";

const base: AiGrantDraft = {
  strategy: 2,
  title: "Ecosystem grant",
  description: "Hybrid grant for a long-term partner.",
  allocation: "800",
  timing: { unit: "60", cliff: "1", duration: "6", realWorldNote: "" },
  milestones: [
    { title: "Onboarding", percentOfAllocation: 40 },
    { title: "Delivery", percentOfAllocation: 60 },
  ],
  assumptions: ["Both conditions apply."],
  unsupported: ["Cannot pick a reviewer wallet."],
};

function normalize(draft: Partial<AiGrantDraft>) {
  return normalizeAiDraft({
    draft: { ...base, ...draft },
    droppedFields: [],
    redactions: [],
  });
}

function codes(result: { adjustments: { code: AiAdjustmentCode }[] }) {
  return result.adjustments.map((adjustment) => adjustment.code);
}

describe("normalizeAiDraft", () => {
  it("passes a sound draft through untouched, as a generated preset", () => {
    const result = normalize({});
    expect(result.preset.key).toBe(GENERATED_PRESET_KEY);
    expect(result.preset.titleSuggestion).toBe("Ecosystem grant");
    expect(result.preset.allocationSuggestion).toBe("800");
    expect(result.preset.reviewerRequired).toBe(true);
    expect(result.adjustments).toEqual([]);
    expect(result.unsupported).toEqual(["Cannot pick a reviewer wallet."]);
  });

  it("always produces a preset the catalog's own validator accepts", () => {
    for (const draft of [
      {},
      { strategy: 0 as const },
      { strategy: 1 as const },
      { strategy: 2 as const, milestones: null },
      { timing: null },
    ])
      expect(() => assertValidPreset(normalize(draft).preset)).not.toThrow();
  });

  it("clamps an allocation the demo faucet could never fund", () => {
    const result = normalize({ allocation: "20000" });
    expect(result.preset.allocationSuggestion).toBe("1000");
    expect(result.adjustments).toContainEqual({
      code: "allocationClamped",
      values: { requested: "20000", maximum: "1000" },
    });
  });

  it("clamps a cliff longer than its own schedule", () => {
    const result = normalize({
      timing: { unit: "60", cliff: "9", duration: "6", realWorldNote: "" },
    });
    expect(result.preset.timing).toMatchObject({ cliff: "6", duration: "6" });
    expect(codes(result)).toContain("cliffClamped");
  });

  it("replaces a zero duration with the wizard's own default", () => {
    const result = normalize({
      timing: { unit: "60", cliff: "0", duration: "0", realWorldNote: "" },
    });
    expect(result.preset.timing).toMatchObject({ duration: "5" });
    expect(codes(result)).toContain("durationDefaulted");
  });

  it("clamps a schedule written in seconds when the unit already is", () => {
    // Observed live: a model answered unit "86400" with duration "15552000",
    // meaning six months expressed in seconds — a forty-thousand-year grant
    // that is otherwise perfectly well-formed, so nothing else would catch it.
    const result = normalize({
      timing: {
        unit: "86400",
        cliff: "0",
        duration: "15552000",
        realWorldNote: "",
      },
    });
    expect(result.preset.timing).toMatchObject({ duration: "3650" });
    expect(result.adjustments).toContainEqual({
      code: "durationClamped",
      values: { requested: "15552000", maximum: "3650" },
    });
  });

  it("measures the ceiling in seconds, not in steps", () => {
    // Ten years is 5,256,000 minutes but only 3,650 days, so the same number
    // of steps is fine in one unit and absurd in another.
    expect(
      normalize({
        timing: {
          unit: "60",
          cliff: "0",
          duration: "100000",
          realWorldNote: "",
        },
      }).preset.timing,
    ).toMatchObject({ duration: "100000" });
    expect(
      normalize({
        timing: {
          unit: "86400",
          cliff: "0",
          duration: "100000",
          realWorldNote: "",
        },
      }).preset.timing,
    ).toMatchObject({ duration: "3650" });
  });

  it("leaves a real schedule alone", () => {
    const result = normalize({
      timing: {
        unit: "86400",
        cliff: "30",
        duration: "180",
        realWorldNote: "",
      },
    });
    expect(result.preset.timing).toMatchObject({
      duration: "180",
      cliff: "30",
    });
    expect(codes(result)).not.toContain("durationClamped");
  });

  it("drops milestones from a time grant and a schedule from a milestone grant", () => {
    const time = normalize({ strategy: 0 });
    expect(time.preset.milestones).toBeNull();
    expect(time.preset.reviewerRequired).toBe(false);
    expect(codes(time)).toContain("milestonesDropped");

    const milestone = normalize({ strategy: 1 });
    expect(milestone.preset.timing).toBeNull();
    expect(codes(milestone)).toContain("timingDropped");
  });

  it("supplies what a strategy needs and the draft omitted", () => {
    const noTiming = normalize({ strategy: 0, timing: null, milestones: null });
    expect(noTiming.preset.timing).toEqual({
      unit: "60",
      cliff: "0",
      duration: "5",
      realWorldNote: "",
    });
    expect(codes(noTiming)).toContain("timingDefaulted");

    const noMilestones = normalize({
      strategy: 1,
      timing: null,
      milestones: null,
    });
    expect(noMilestones.preset.milestones).toEqual([
      { title: "Ecosystem grant", percentOfAllocation: 100 },
    ]);
    expect(codes(noMilestones)).toContain("milestonesDefaulted");
  });

  it("rescales percentages that do not add up to 100", () => {
    const result = normalize({
      milestones: [
        { title: "A", percentOfAllocation: 30 },
        { title: "B", percentOfAllocation: 30 },
        { title: "C", percentOfAllocation: 30 },
      ],
    });
    const percentages = result.preset.milestones?.map(
      (milestone) => milestone.percentOfAllocation,
    );
    expect(percentages?.reduce((sum, percent) => sum + percent, 0)).toBe(100);
    expect(codes(result)).toContain("percentagesRescaled");
  });

  it("never rescales a milestone down to nothing", () => {
    const result = normalize({
      milestones: [
        { title: "A", percentOfAllocation: 1 },
        { title: "B", percentOfAllocation: 9999 },
      ],
    });
    const percentages = result.preset.milestones?.map(
      (milestone) => milestone.percentOfAllocation,
    );
    expect(percentages?.every((percent) => percent > 0)).toBe(true);
    expect(percentages?.reduce((sum, percent) => sum + percent, 0)).toBe(100);
  });

  it("truncates a milestone list past the vault's own limit and rescales it", () => {
    const result = normalize({
      milestones: Array.from({ length: 30 }, (_, index) => ({
        title: `Step ${index}`,
        percentOfAllocation: 10,
      })),
    });
    expect(result.preset.milestones).toHaveLength(20);
    expect(
      result.preset.milestones?.reduce(
        (sum, milestone) => sum + milestone.percentOfAllocation,
        0,
      ),
    ).toBe(100);
    expect(codes(result)).toContain("milestonesTruncated");
  });

  it("fills a milestone title the model left blank", () => {
    const result = normalize({
      milestones: [
        { title: "", percentOfAllocation: 50 },
        { title: "Delivery", percentOfAllocation: 50 },
      ],
    });
    expect(result.preset.milestones?.[0].title).toBe("Ecosystem grant 1");
    expect(codes(result)).toContain("milestoneTitlesFilled");
  });

  it("reports dropped fields and redacted prose as adjustments", () => {
    const result = normalizeAiDraft({
      draft: base,
      droppedFields: ["beneficiary", "start"],
      redactions: ["address"],
    });
    expect(result.adjustments).toContainEqual({
      code: "fieldsDropped",
      values: { count: 2, fields: "beneficiary, start" },
    });
    expect(codes(result)).toContain("proseRedacted");
  });

  it("refuses a draft with no value to grant at all", () => {
    expect(() => normalize({ allocation: "0" })).toThrow(InvalidAiDraftError);
  });
});
