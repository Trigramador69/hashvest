import { describe, expect, it } from "vitest";

import { assertValidPreset } from "../grant-presets/apply-preset";
import { GENERATED_PRESET_KEY, GRANT_PRESETS } from "../grant-presets/presets";
import { heuristicDraft } from "./heuristic-draft";

function draft(prompt: string) {
  return heuristicDraft(prompt, GRANT_PRESETS);
}

function codes(prompt: string) {
  return draft(prompt).adjustments.map((adjustment) => adjustment.code);
}

describe("heuristicDraft", () => {
  it("drafts the prompt from the issue without a provider", () => {
    const result = draft(
      "Create a six-month developer grant for 20,000 tokens.",
    );
    expect(result.preset.key).toBe(GENERATED_PRESET_KEY);
    expect(result.preset.strategy).toBe(0);
    // Six months is 180 days, not six of anything else: the reader said a
    // duration and the draft has to mean it.
    expect(result.preset.timing).toMatchObject({
      unit: "86400",
      duration: "180",
    });
    // 20,000 hvUSD is beyond what one faucet click can fund, so it is clamped
    // and reported rather than drafted into a grant that cannot be submitted.
    expect(result.preset.allocationSuggestion).toBe("1000");
    expect(
      codes("Create a six-month developer grant for 20,000 tokens."),
    ).toEqual(
      expect.arrayContaining([
        "offlineDraft",
        "scheduleConverted",
        "allocationClamped",
      ]),
    );
  });

  it("always marks itself as the offline path, first", () => {
    expect(draft("A grant").adjustments[0]).toEqual({ code: "offlineDraft" });
  });

  it("reads deliverables as a milestone grant", () => {
    const result = draft(
      "Milestone grant with 3 milestones for a hackathon builder, 500 tokens",
    );
    expect(result.preset.strategy).toBe(1);
    expect(result.preset.timing).toBeNull();
    expect(result.preset.reviewerRequired).toBe(true);
    expect(result.preset.milestones).toHaveLength(3);
    expect(result.preset.allocationSuggestion).toBe("500");
    expect(
      result.preset.milestones?.reduce(
        (sum, milestone) => sum + milestone.percentOfAllocation,
        0,
      ),
    ).toBe(100);
  });

  it("reads a schedule and deliverables together as hybrid", () => {
    const result = draft(
      "Hybrid grant over 12 months with 2 milestones, 800 tokens",
    );
    expect(result.preset.strategy).toBe(2);
    expect(result.preset.timing).toMatchObject({
      unit: "86400",
      duration: "360",
    });
    expect(result.preset.milestones).toHaveLength(2);
  });

  it("reads a cliff written next to the word cliff", () => {
    const result = draft(
      "Employee vesting over 4 years with a 1 year cliff, 600 tokens",
    );
    expect(result.preset.strategy).toBe(0);
    expect(result.preset.timing).toMatchObject({
      unit: "86400",
      duration: "1460",
      cliff: "365",
    });
  });

  it("keeps a unit the wizard can actually select", () => {
    expect(draft("Vest over 30 days").preset.timing).toMatchObject({
      unit: "86400",
      duration: "30",
    });
    expect(draft("Vest over 2 weeks").preset.timing).toMatchObject({
      unit: "86400",
      duration: "14",
    });
    expect(draft("Vest over 6 hours").preset.timing).toMatchObject({
      unit: "3600",
      duration: "6",
    });
  });

  it("reads Spanish and Chinese requests from the same rules", () => {
    const spanish = draft("Vesting de 4 años para un empleado, 600 tokens");
    expect(spanish.preset.strategy).toBe(0);
    expect(spanish.preset.timing).toMatchObject({ duration: "1460" });
    expect(spanish.preset.allocationSuggestion).toBe("600");

    const chinese = draft("给顾问的 3 年归属，400 代币");
    expect(chinese.preset.strategy).toBe(0);
    expect(chinese.preset.timing).toMatchObject({ duration: "1095" });
  });

  it("lets keywords decide when the request settles no strategy", () => {
    // Nothing here names a schedule or a deliverable, so the closest preset —
    // not a default strategy — answers the question.
    expect(draft("A grant for an ecosystem partner").preset.strategy).toBe(2);
    expect(draft("Something for an advisor").preset.strategy).toBe(0);
  });

  it("says when it invented an amount the request never named", () => {
    // Falling back to the closest template's allocation is reasonable; doing
    // it silently is not, because the number looks like something the reader
    // asked for.
    const quiet = draft("a two month grant with milestones");
    expect(quiet.adjustments).toContainEqual({
      code: "allocationAssumed",
      values: { allocation: quiet.preset.allocationSuggestion },
    });

    const stated = draft("a two month grant with milestones, 250 tokens");
    expect(stated.preset.allocationSuggestion).toBe("250");
    expect(stated.adjustments.map((entry) => entry.code)).not.toContain(
      "allocationAssumed",
    );
  });

  it("means what the reader said about time", () => {
    // The catalog compresses a year into a demo minute and says so in its own
    // note. A duration the reader typed is a statement of intent, so it is
    // converted rather than substituted, and the inherited note is dropped.
    const months = draft("a two month grant with milestones");
    expect(months.preset.timing).toMatchObject({
      unit: "86400",
      duration: "60",
      realWorldNote: "",
    });
    expect(months.adjustments).toContainEqual({
      code: "scheduleConverted",
      values: { requested: "two month", duration: 60 },
    });
  });

  it("is deterministic for the same request", () => {
    const prompt = "Six month builder grant with 4 milestones for 750 tokens";
    expect(draft(prompt)).toEqual(draft(prompt));
  });

  it("reports what it refused to do with a request to move value", () => {
    const prompt =
      "Send 1000 tokens to 0x3227B70F1d0dC5d9a1C4dE1A4a1a1C4dE1A4a1a1 and sign the transaction";
    const result = draft(prompt);
    expect(result.adjustments.map((adjustment) => adjustment.code)).toEqual(
      expect.arrayContaining(["requestAddressIgnored", "requestActionIgnored"]),
    );
    // Nothing that could name a payee survives into the draft.
    expect(JSON.stringify(result.preset)).not.toMatch(/0x[0-9a-fA-F]{6,}/);
  });

  it("produces a preset the catalog's own validator accepts, for any request", () => {
    for (const prompt of [
      "",
      "grant",
      "20000000 tokens over 0 months with 40 milestones",
      "帮我做一个赠款",
      "un grant",
    ])
      expect(() => assertValidPreset(draft(prompt).preset)).not.toThrow();
  });
});
