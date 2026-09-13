import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";

import {
  BLANK_PRESET_FIELDS,
  clearPreset,
  resyncMilestoneAmounts,
  selectPreset,
  type AppliedPreset,
} from "./wizard-state";
import { getGrantPreset } from "./presets";

const builder = getGrantPreset("builder-grant"); // MILESTONE, 1000, 20/50/30
const employee = getGrantPreset("employee-vesting"); // TIME, 600
const ecosystem = getGrantPreset("ecosystem-grant"); // HYBRID, 800, 40/60

/** The wizard writes what `selectPreset`/`clearPreset` return; so does this. */
function apply(key: Parameters<typeof selectPreset>[0], from = blank()) {
  const applied = selectPreset(key, from.fields, from.applied);
  return { fields: applied.fields, applied };
}

function blank() {
  return {
    fields: BLANK_PRESET_FIELDS,
    applied: undefined as AppliedPreset | undefined,
  };
}

describe("switching presets", () => {
  it("uses the locale-resolved copy for editable suggestions", () => {
    const localized = {
      ...builder,
      titleSuggestion: "Subvención para builders",
      milestones: builder.milestones!.map((milestone, index) => ({
        ...milestone,
        title: ["Arranque y diseño", "Implementación principal", "Entrega"][
          index
        ],
      })),
    };
    const applied = selectPreset(
      "builder-grant",
      BLANK_PRESET_FIELDS,
      undefined,
      { preset: localized },
    );

    expect(applied.fields.title).toBe("Subvención para builders");
    expect(applied.fields.milestones.map((item) => item.title)).toEqual([
      "Arranque y diseño",
      "Implementación principal",
      "Entrega",
    ]);
  });

  it("replaces a title and allocation the previous preset suggested", () => {
    const first = apply("builder-grant");
    expect(first.fields.title).toBe(builder.titleSuggestion);
    expect(first.fields.allocation).toBe(builder.allocationSuggestion);

    const second = apply("employee-vesting", first);
    expect(second.fields.title).toBe(employee.titleSuggestion);
    expect(second.fields.allocation).toBe(employee.allocationSuggestion);
    expect(second.applied.userOwned).toEqual([]);
  });

  it("carries a title and allocation the user typed first", () => {
    const typed = {
      fields: {
        ...BLANK_PRESET_FIELDS,
        title: "Q3 core team",
        allocation: "250",
      },
      applied: undefined,
    };
    const first = apply("builder-grant", typed);
    expect(first.fields.title).toBe("Q3 core team");
    expect(first.fields.allocation).toBe("250");
    expect(first.applied.userOwned).toEqual(["title", "allocation"]);

    // Still theirs after a second and a third preset.
    const second = apply("ecosystem-grant", first);
    const third = apply("employee-vesting", second);
    expect(third.fields.title).toBe("Q3 core team");
    expect(third.fields.allocation).toBe("250");
  });

  it("keeps a title edited after a preset was applied", () => {
    const first = apply("builder-grant");
    const edited = {
      fields: { ...first.fields, title: "Renamed by hand" },
      applied: first.applied,
    };
    const second = apply("employee-vesting", edited);
    expect(second.fields.title).toBe("Renamed by hand");
    expect(second.applied.userOwned).toContain("title");
  });

  it("carries edits to description, schedule, and milestones across a switch", () => {
    const first = apply("builder-grant");
    const edited = {
      fields: {
        ...first.fields,
        description: "Hand-written workspace context.",
        unit: "3600",
        cliff: "2",
        duration: "12",
        milestones: first.fields.milestones.map((milestone, index) =>
          index === 0 ? { ...milestone, title: "Custom kickoff" } : milestone,
        ),
      },
      applied: first.applied,
    };

    const second = apply("employee-vesting", edited);

    expect(second.fields.description).toBe("Hand-written workspace context.");
    expect(second.fields.unit).toBe("3600");
    expect(second.fields.cliff).toBe("2");
    expect(second.fields.duration).toBe("12");
    expect(second.fields.milestones[0]?.title).toBe("Custom kickoff");
    expect(second.fields.strategy).toBe(employee.strategy);
    expect(second.applied.userOwned).toEqual([
      "description",
      "unit",
      "cliff",
      "duration",
      "milestones",
    ]);
  });

  it("re-splits the milestone amounts against the carried allocation", () => {
    const typed = {
      fields: { ...BLANK_PRESET_FIELDS, allocation: "500" },
      applied: undefined,
    };
    const { fields } = apply("builder-grant", typed);
    expect(fields.milestones.map((milestone) => milestone.amount)).toEqual([
      "100",
      "250",
      "150",
    ]);
  });

  it("always leaves one milestone row for a time preset", () => {
    const { fields } = apply("employee-vesting");
    expect(fields.milestones).toEqual([{ title: "", amount: "" }]);
    expect(fields.strategy).toBe(0);
  });
});

describe("clearing a preset", () => {
  it("returns every preset-written field to the wizard's own blank default", () => {
    const applied = apply("ecosystem-grant");
    const cleared = clearPreset(applied.fields, applied.applied);
    expect(cleared).toEqual(BLANK_PRESET_FIELDS);
  });

  it("never deletes a title or allocation the user typed themselves", () => {
    const typed = {
      fields: {
        ...BLANK_PRESET_FIELDS,
        title: "Q3 core team",
        allocation: "250",
      },
      applied: undefined,
    };
    const applied = apply("builder-grant", typed);
    const cleared = clearPreset(applied.fields, applied.applied);
    expect(cleared.title).toBe("Q3 core team");
    expect(cleared.allocation).toBe("250");
    // The preset's own contributions still go.
    expect(cleared.strategy).toBe(0);
    expect(cleared.milestones).toEqual([{ title: "", amount: "" }]);
  });

  it("keeps fields the user edited after the preset was applied", () => {
    const applied = apply("employee-vesting");
    const edited = {
      ...applied.fields,
      cliff: "2",
      description: "Hand-written context.",
    };
    const cleared = clearPreset(edited, applied.applied);
    expect(cleared.cliff).toBe("2");
    expect(cleared.description).toBe("Hand-written context.");
    expect(cleared.duration).toBe(BLANK_PRESET_FIELDS.duration);
  });

  it("keeps an edited milestone split rather than discarding the work", () => {
    const applied = apply("builder-grant");
    const edited = {
      ...applied.fields,
      milestones: [
        { title: "Kickoff & design", amount: "300" },
        ...applied.fields.milestones.slice(1),
      ],
    };
    expect(clearPreset(edited, applied.applied).milestones).toEqual(
      edited.milestones,
    );
  });

  it("is a no-op when no preset was applied", () => {
    const fields = { ...BLANK_PRESET_FIELDS, title: "Typed by hand" };
    expect(clearPreset(fields, undefined)).toEqual(fields);
  });
});

describe("re-splitting milestones when the allocation changes", () => {
  it("keeps the amounts summing to exactly the allocation prepare() checks", () => {
    const applied = apply("ecosystem-grant");
    const resynced = resyncMilestoneAmounts(
      "333.333333333333333333",
      applied.fields.milestones,
      applied.applied,
    );
    const total = resynced!.fields.milestones.reduce(
      (sum, milestone) => sum + parseUnits(milestone.amount, 18),
      0n,
    );
    expect(total).toBe(parseUnits("333.333333333333333333", 18));
    expect(resynced!.fields.milestones.map((item) => item.title)).toEqual(
      ecosystem.milestones!.map((item) => item.title),
    );
  });

  it("records the new allocation as the user's own, so it survives a switch", () => {
    const applied = apply("builder-grant");
    const resynced = resyncMilestoneAmounts(
      "500",
      applied.fields.milestones,
      applied.applied,
    )!;
    expect(resynced.userOwned).toContain("allocation");

    const next = selectPreset("employee-vesting", resynced.fields, resynced);
    expect(next.fields.allocation).toBe("500");
    expect(clearPreset(next.fields, next).allocation).toBe("500");
  });

  it("stops once the user has edited the split", () => {
    const applied = apply("builder-grant");
    const edited = [
      { title: "Kickoff & design", amount: "300" },
      ...applied.fields.milestones.slice(1),
    ];
    expect(
      resyncMilestoneAmounts("500", edited, applied.applied),
    ).toBeUndefined();
  });

  it("does nothing without a preset or without milestones", () => {
    const time = apply("employee-vesting");
    expect(
      resyncMilestoneAmounts("500", time.fields.milestones, time.applied),
    ).toBeUndefined();
    expect(
      resyncMilestoneAmounts("500", BLANK_PRESET_FIELDS.milestones, undefined),
    ).toBeUndefined();
  });
});

describe("the workspace description", () => {
  it("is written for organization-aware creation", () => {
    const applied = selectPreset(
      "builder-grant",
      BLANK_PRESET_FIELDS,
      undefined,
      {
        applyDescription: true,
      },
    );
    expect(applied.fields.description).toBe(builder.descriptionSuggestion);
  });

  it("records nothing when the wizard has no description field", () => {
    const applied = selectPreset(
      "builder-grant",
      BLANK_PRESET_FIELDS,
      undefined,
      {
        applyDescription: false,
      },
    );
    expect(applied.fields.description).toBe("");
    expect(clearPreset(applied.fields, applied).description).toBe("");
  });
});
