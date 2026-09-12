import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";

import {
  applyPresetToDraft,
  assertValidCatalog,
  assertValidPreset,
  splitAllocationByPercent,
} from "./apply-preset";
import {
  GRANT_PRESETS,
  getGrantPreset,
  type GrantPreset,
  type GrantPresetTiming,
} from "./presets";

const timePreset = getGrantPreset("employee-vesting");
const milestonePreset = getGrantPreset("builder-grant");
const hybridPreset = getGrantPreset("ecosystem-grant");

function mutate(
  preset: GrantPreset,
  changes: Partial<GrantPreset>,
): GrantPreset {
  return { ...preset, ...changes };
}

describe("preset to wizard mapping", () => {
  it("produces values the wizard's own field vocabulary accepts", () => {
    for (const preset of GRANT_PRESETS) {
      const draft = applyPresetToDraft(preset, { decimals: 18 });
      expect(["60", "3600", "86400"]).toContain(draft.unit);
      expect(draft.allocation).toMatch(/^\d+(\.\d+)?$/);
      expect(draft.cliff).toMatch(/^\d+$/);
      expect(draft.duration).toMatch(/^\d+$/);
      // The wizard rejects a cliff longer than the duration in prepare().
      expect(BigInt(draft.cliff)).toBeLessThanOrEqual(BigInt(draft.duration));
      for (const milestone of draft.milestones) {
        expect(milestone.title.trim()).not.toBe("");
        expect(milestone.amount).toMatch(/^\d+(\.\d+)?$/);
      }
    }
  });

  it("keeps every suggested allocation fundable from one faucet click", () => {
    // DemoToken.FAUCET_AMOUNT is 1_000 ether; createGrant refuses to create a
    // grant the issuer cannot fully fund.
    for (const preset of GRANT_PRESETS)
      expect(Number(preset.allocationSuggestion)).toBeLessThanOrEqual(1000);
  });

  it("maps time vesting without milestones or a reviewer", () => {
    const draft = applyPresetToDraft(timePreset, { decimals: 18 });
    expect(draft.strategy).toBe(0);
    expect(draft.milestones).toEqual([]);
    expect(draft.reviewerRequired).toBe(false);
    expect(draft.cliff).toBe("1");
    expect(draft.duration).toBe("4");
  });

  it("maps a milestone grant to a reviewer-backed split and no schedule", () => {
    const draft = applyPresetToDraft(milestonePreset, {
      allocationDecimal: "1000",
      decimals: 18,
    });
    expect(draft.strategy).toBe(1);
    expect(draft.reviewerRequired).toBe(true);
    expect(draft.milestones).toEqual([
      { title: "Kickoff & design", amount: "200" },
      { title: "Core implementation", amount: "500" },
      { title: "Launch & handoff", amount: "300" },
    ]);
  });

  it("maps a hybrid grant to both a schedule and milestones", () => {
    const draft = applyPresetToDraft(hybridPreset, { decimals: 18 });
    expect(draft.strategy).toBe(2);
    expect(draft.reviewerRequired).toBe(true);
    expect(draft.duration).toBe("6");
    expect(draft.milestones.map((item) => item.amount)).toEqual(["320", "480"]);
  });

  it("keeps a title the user already typed", () => {
    expect(
      applyPresetToDraft(milestonePreset, { title: "  Grant for Ana  " }).title,
    ).toBe("Grant for Ana");
    expect(applyPresetToDraft(milestonePreset, { title: "  " }).title).toBe(
      milestonePreset.titleSuggestion,
    );
  });

  it("keeps an allocation the user already typed", () => {
    const draft = applyPresetToDraft(milestonePreset, {
      allocationDecimal: " 250 ",
      decimals: 18,
    });
    expect(draft.allocation).toBe("250");
    expect(draft.milestones.map((item) => item.amount)).toEqual([
      "50",
      "125",
      "75",
    ]);
  });

  it("falls back to the preset's suggestion when no allocation is entered", () => {
    expect(
      applyPresetToDraft(milestonePreset, { allocationDecimal: "" }).allocation,
    ).toBe(milestonePreset.allocationSuggestion);
  });
});

describe("milestone allocation splitting", () => {
  it("always sums back to exactly the allocation", () => {
    const cases: {
      allocation: string;
      decimals: number;
      percentages: number[];
    }[] = [
      { allocation: "1000", decimals: 18, percentages: [20, 50, 30] },
      { allocation: "1", decimals: 6, percentages: [40, 60] },
      // 10 / 3 does not divide evenly: the remainder must not vanish.
      { allocation: "10", decimals: 0, percentages: [33, 33, 34] },
      { allocation: "0.000003", decimals: 6, percentages: [20, 50, 30] },
      { allocation: "7", decimals: 0, percentages: [50, 50] },
    ];
    for (const { allocation, decimals, percentages } of cases) {
      const amounts = splitAllocationByPercent(
        allocation,
        decimals,
        percentages,
      );
      expect(amounts).toHaveLength(percentages.length);
      const total = amounts.reduce(
        (sum, amount) => sum + parseUnits(amount, decimals),
        0n,
      );
      expect(total).toBe(parseUnits(allocation, decimals));
    }
  });

  it("returns blank amounts for an unusable allocation instead of guessing", () => {
    expect(splitAllocationByPercent("", 18, [50, 50])).toEqual(["", ""]);
    expect(splitAllocationByPercent("not a number", 18, [50, 50])).toEqual([
      "",
      "",
    ]);
    expect(splitAllocationByPercent("0", 18, [50, 50])).toEqual(["", ""]);
  });

  it("never rounds a milestone up past the allocation", () => {
    // 1 base unit across three milestones: only the remainder-holder gets it.
    expect(splitAllocationByPercent("1", 0, [33, 33, 34])).toEqual([
      "0",
      "0",
      "1",
    ]);
  });
});

describe("invalid preset combinations", () => {
  it("rejects reviewer or milestone semantics on a TIME preset", () => {
    expect(() =>
      assertValidPreset(mutate(timePreset, { reviewerRequired: true })),
    ).toThrow(/do not use a reviewer/);
    expect(() =>
      assertValidPreset(
        mutate(timePreset, {
          milestones: [{ title: "Ship it", percentOfAllocation: 100 }],
        }),
      ),
    ).toThrow(/no milestones/);
  });

  it("rejects a TIME or HYBRID preset without a schedule", () => {
    expect(() =>
      assertValidPreset(mutate(timePreset, { timing: null })),
    ).toThrow(/requires a vesting schedule/);
    expect(() =>
      assertValidPreset(mutate(hybridPreset, { timing: null })),
    ).toThrow(/requires a vesting schedule/);
  });

  it("rejects a MILESTONE preset that carries a schedule", () => {
    expect(() =>
      assertValidPreset(
        mutate(milestonePreset, { timing: hybridPreset.timing }),
      ),
    ).toThrow(/no vesting schedule/);
  });

  it("rejects milestone lists the wizard would refuse", () => {
    expect(() =>
      assertValidPreset(mutate(milestonePreset, { milestones: null })),
    ).toThrow(/between 1 and 20 milestones/);
    expect(() =>
      assertValidPreset(mutate(milestonePreset, { milestones: [] })),
    ).toThrow(/between 1 and 20 milestones/);
    expect(() =>
      assertValidPreset(
        mutate(milestonePreset, {
          milestones: Array.from({ length: 21 }, (_, index) => ({
            title: `Milestone ${index + 1}`,
            percentOfAllocation: 5,
          })),
        }),
      ),
    ).toThrow(/between 1 and 20 milestones/);
  });

  it("rejects percentages that do not add up to the whole allocation", () => {
    expect(() =>
      assertValidPreset(
        mutate(milestonePreset, {
          milestones: [
            { title: "Half", percentOfAllocation: 50 },
            { title: "A bit", percentOfAllocation: 10 },
          ],
        }),
      ),
    ).toThrow(/add up to 100, got 60/);
  });

  it("rejects a milestone grant without a reviewer", () => {
    expect(() =>
      assertValidPreset(mutate(milestonePreset, { reviewerRequired: false })),
    ).toThrow(/requires a reviewer/);
  });

  it("rejects a schedule the wizard's prepare() would reject", () => {
    expect(() =>
      assertValidPreset(
        mutate(timePreset, {
          timing: { ...timePreset.timing!, cliff: "40", duration: "20" },
        }),
      ),
    ).toThrow(/cliff cannot be longer/);
    expect(() =>
      assertValidPreset(
        mutate(timePreset, {
          timing: { ...timePreset.timing!, duration: "0" },
        }),
      ),
    ).toThrow(/duration must be a positive/);
  });

  it("rejects fractional percentages before they reach BigInt", () => {
    expect(() =>
      assertValidPreset(
        mutate(milestonePreset, {
          milestones: [
            { title: "Half", percentOfAllocation: 12.5 },
            { title: "Rest", percentOfAllocation: 87.5 },
          ],
        }),
      ),
    ).toThrow(/positive whole numbers/);
  });

  it("rejects a schedule unit the wizard's select does not offer", () => {
    expect(() =>
      assertValidPreset(
        mutate(timePreset, {
          timing: {
            ...timePreset.timing!,
            unit: "604800",
          } as unknown as GrantPresetTiming,
        }),
      ),
    ).toThrow(/unit must be one of/);
  });

  it("rejects keys the organization metadata column could not store", () => {
    expect(() => assertValidPreset(mutate(timePreset, { key: "" }))).toThrow(
      /trimmed, non-empty/,
    );
    expect(() =>
      assertValidPreset(mutate(timePreset, { key: "x".repeat(81) })),
    ).toThrow(/at most 80/);
  });

  it("rejects a catalog with duplicate keys", () => {
    expect(() => assertValidCatalog(GRANT_PRESETS)).not.toThrow();
    expect(() => assertValidCatalog([timePreset, timePreset])).toThrow(
      /Duplicate preset key/,
    );
    expect(() => assertValidCatalog([])).toThrow(/cannot be empty/);
  });

  it("refuses to build a draft from an invalid preset", () => {
    expect(() =>
      applyPresetToDraft(mutate(timePreset, { reviewerRequired: true })),
    ).toThrow(/do not use a reviewer/);
  });
});
