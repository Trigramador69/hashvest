import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";

import {
  applyReviewerDefault,
  BLANK_PRESET_FIELDS,
  clearPreset,
  isPresetEdited,
  resyncMilestoneAmounts,
  selectPreset,
  type AppliedPreset,
  type ReviewerSelection,
} from "./wizard-state";
import { organizationTemplatePreset } from "./organization-template";
import { formatOrganizationTemplateKey } from "./template-key";
import {
  GENERATED_PRESET_KEY,
  getGrantPreset,
  type GrantPreset,
} from "./presets";

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

describe("whether a preset still describes the form (HAS-47)", () => {
  it("reports nothing edited when no preset was applied", () => {
    // Nothing was attributed, so there is nothing that could diverge.
    expect(isPresetEdited(BLANK_PRESET_FIELDS, undefined)).toBe(false);
  });

  it("reports an untouched preset as unedited", () => {
    const { fields, applied } = apply("builder-grant");
    expect(isPresetEdited(fields, applied)).toBe(false);
  });

  it("notices an edited scalar field", () => {
    const { fields, applied } = apply("builder-grant");
    expect(
      isPresetEdited({ ...fields, title: "Something else" }, applied),
    ).toBe(true);
    expect(isPresetEdited({ ...fields, allocation: "42" }, applied)).toBe(true);
    expect(isPresetEdited({ ...fields, strategy: 0 }, applied)).toBe(true);
  });

  it("notices an edited milestone split", () => {
    const { fields, applied } = apply("builder-grant");
    const milestones = fields.milestones.map((item, index) =>
      index === 0 ? { ...item, amount: "1" } : item,
    );
    expect(isPresetEdited({ ...fields, milestones }, applied)).toBe(true);
    expect(
      isPresetEdited(
        { ...fields, milestones: fields.milestones.slice(1) },
        applied,
      ),
    ).toBe(true);
  });

  it("does not call a value the preset inherited from the user an edit", () => {
    // The user typed the title first; the preset kept it. The form still holds
    // exactly what was applied, so the preset still describes it honestly.
    const typed = { ...BLANK_PRESET_FIELDS, title: "My own title" };
    const applied = selectPreset("builder-grant", typed, undefined);
    expect(applied.fields.title).toBe("My own title");
    expect(applied.userOwned).toContain("title");
    expect(isPresetEdited(applied.fields, applied)).toBe(false);
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

describe("a generated draft (HAS-18)", () => {
  /** What lib/cloud/ai/draft-service.ts returns: a preset with no catalog entry. */
  const aiDraft: GrantPreset = {
    key: GENERATED_PRESET_KEY,
    name: "AI draft",
    tagline: "Milestone grant for a scoped build.",
    description: "Milestone grant for a scoped build.",
    bestFor: [],
    strategy: 1,
    titleSuggestion: "Protocol integration grant",
    descriptionSuggestion: "Milestone grant for a scoped build.",
    allocationSuggestion: "600",
    timing: null,
    milestones: [
      { title: "Integration", percentOfAllocation: 40 },
      { title: "Launch", percentOfAllocation: 60 },
    ],
    reviewerRequired: true,
    assumptions: ["A reviewer approves each milestone."],
  };

  it("applies through the same path as a catalog preset", () => {
    const applied = selectPreset(
      GENERATED_PRESET_KEY,
      BLANK_PRESET_FIELDS,
      undefined,
      { preset: aiDraft },
    );
    expect(applied.key).toBe(GENERATED_PRESET_KEY);
    expect(applied.fields.title).toBe("Protocol integration grant");
    expect(applied.fields.strategy).toBe(1);
    expect(applied.fields.reviewerRequired).toBe(true);
    expect(applied.fields.milestones.map((item) => item.title)).toEqual([
      "Integration",
      "Launch",
    ]);
    expect(applied.fields.milestones[0].amount).toBe("240");
  });

  it("refuses a generated key with nothing to apply", () => {
    // There is no catalog entry to fall back to, and silently applying some
    // other preset would put values on screen the draft never suggested.
    expect(() =>
      selectPreset(GENERATED_PRESET_KEY, BLANK_PRESET_FIELDS, undefined),
    ).toThrow("no catalog entry");
  });

  it("re-splits its own milestones when the allocation changes", () => {
    const applied = selectPreset(
      GENERATED_PRESET_KEY,
      BLANK_PRESET_FIELDS,
      undefined,
      { preset: aiDraft },
    );
    // Looking the percentages up by key would throw: the draft is not in the
    // catalog. They come from the applied preset itself.
    const resynced = resyncMilestoneAmounts(
      "1000",
      applied.fields.milestones,
      applied,
    );
    expect(resynced?.fields.milestones.map((item) => item.amount)).toEqual([
      "400",
      "600",
    ]);
    expect(resynced?.userOwned).toContain("allocation");
  });

  it("can be swapped for a catalog preset and cleared like any other", () => {
    const applied = selectPreset(
      GENERATED_PRESET_KEY,
      BLANK_PRESET_FIELDS,
      undefined,
      { preset: aiDraft },
    );
    const swapped = selectPreset("employee-vesting", applied.fields, applied);
    expect(swapped.key).toBe("employee-vesting");
    expect(swapped.fields.title).toBe(employee.titleSuggestion);
    expect(swapped.userOwned).toEqual([]);

    const cleared = clearPreset(applied.fields, applied);
    expect(cleared).toEqual(BLANK_PRESET_FIELDS);
  });
});

describe("an organization template (HAS-13)", () => {
  const TEMPLATE_ID = "9d1e4b2a-7c3f-4a8e-9b21-5f6c0d3ac2a4";
  const template = organizationTemplatePreset({
    id: TEMPLATE_ID,
    version: 2,
    name: "Partner integration",
    description: "Integration work reviewed by the partnerships lead.",
    strategy: 2,
    schedule: { unitSeconds: 86400, cliffUnits: 7, durationUnits: 90 },
    milestones: [
      { title: "Integration", percentOfAllocation: 25 },
      { title: "Adoption", percentOfAllocation: 75 },
    ],
    allocationSuggestion: "800",
    defaultReviewerMemberId: "3b7c2d1e-8f4a-4c5b-9d6e-1a2b3c4d5e6f",
  });

  function applyTemplate(from = blank()) {
    return selectPreset(template.key, from.fields, from.applied, {
      preset: template,
    });
  }

  it("refuses a template key with nothing to apply", () => {
    expect(() =>
      selectPreset(
        formatOrganizationTemplateKey(TEMPLATE_ID, 2),
        BLANK_PRESET_FIELDS,
        undefined,
      ),
    ).toThrow("no catalog entry");
  });

  it("replaces what a previous preset suggested and keeps what the user typed", () => {
    const builderApplied = selectPreset(
      "builder-grant",
      BLANK_PRESET_FIELDS,
      undefined,
    );
    const edited = { ...builderApplied.fields, title: "Q4 partner work" };
    const applied = applyTemplate({ fields: edited, applied: builderApplied });

    expect(applied.key).toBe(template.key);
    expect(applied.fields).toMatchObject({
      title: "Q4 partner work",
      allocation: "800",
      strategy: 2,
      unit: "86400",
      cliff: "7",
      duration: "90",
    });
    expect(applied.fields.milestones).toEqual([
      { title: "Integration", amount: "200" },
      { title: "Adoption", amount: "600" },
    ]);
    expect(applied.userOwned).toEqual(["title"]);
  });

  it("can be switched to a catalog preset or cleared without losing user edits", () => {
    const applied = applyTemplate();
    const edited = { ...applied.fields, cliff: "14" };

    const switched = selectPreset("employee-vesting", edited, applied);
    expect(switched.fields.cliff).toBe("14");
    expect(switched.fields.title).toBe(employee.titleSuggestion);

    expect(clearPreset(edited, applied)).toEqual({
      ...BLANK_PRESET_FIELDS,
      cliff: "14",
    });
  });

  it("re-splits its own percentages when the allocation changes", () => {
    const applied = applyTemplate();
    const resynced = resyncMilestoneAmounts(
      "1000",
      applied.fields.milestones,
      applied,
    );
    expect(resynced?.fields.milestones.map((item) => item.amount)).toEqual([
      "250",
      "750",
    ]);
  });
});

describe("applyReviewerDefault (HAS-13)", () => {
  const LEAD = {
    id: "lead",
    walletAddress: "0x00000000000000000000000000000000000000a1",
  };
  const OTHER = {
    id: "other",
    walletAddress: "0x00000000000000000000000000000000000000b2",
  };
  const empty = (external: boolean): ReviewerSelection => ({
    memberId: "",
    address: "",
    external,
  });

  function resolve(
    path: "organization" | "direct",
    current: ReviewerSelection,
    overrides: Partial<Parameters<typeof applyReviewerDefault>[0]> = {},
  ) {
    return applyReviewerDefault({
      path,
      strategy: 1,
      defaultReviewerMemberId: LEAD.id,
      members: [OTHER, LEAD],
      current,
      ...overrides,
    });
  }

  it("preselects the member in the organization-aware picker", () => {
    expect(resolve("organization", empty(false))).toEqual({
      memberId: LEAD.id,
      address: LEAD.walletAddress,
      external: false,
    });
  });

  it("fills the member's current wallet as editable text when direct", () => {
    expect(resolve("direct", empty(true))).toEqual({
      memberId: "",
      address: LEAD.walletAddress,
      external: true,
    });
    expect(resolve("direct", empty(true), { strategy: 2 }).address).toBe(
      LEAD.walletAddress,
    );
  });

  it("never overwrites a member the user picked", () => {
    const picked = {
      memberId: OTHER.id,
      address: OTHER.walletAddress,
      external: false,
    };
    expect(resolve("organization", picked)).toBe(picked);
  });

  it("never overwrites an address the user typed, on either path", () => {
    const typed = {
      memberId: "",
      address: "0x00000000000000000000000000000000000000c3",
      external: true,
    };
    expect(resolve("organization", typed)).toBe(typed);
    expect(resolve("direct", typed)).toBe(typed);
  });

  it("leaves a chosen external-wallet fallback alone, even while empty", () => {
    const external = empty(true);
    expect(resolve("organization", external)).toBe(external);
  });

  it("fills nothing for time vesting", () => {
    expect(resolve("organization", empty(false), { strategy: 0 })).toEqual(
      empty(false),
    );
    expect(resolve("direct", empty(true), { strategy: 0 })).toEqual(
      empty(true),
    );
  });

  it("fills nothing when the template has no default", () => {
    expect(
      resolve("organization", empty(false), { defaultReviewerMemberId: null }),
    ).toEqual(empty(false));
  });

  it("fills nothing for a member who has left, or before members load", () => {
    expect(resolve("organization", empty(false), { members: [OTHER] })).toEqual(
      empty(false),
    );
    expect(resolve("direct", empty(true), { members: undefined })).toEqual(
      empty(true),
    );
  });
});
