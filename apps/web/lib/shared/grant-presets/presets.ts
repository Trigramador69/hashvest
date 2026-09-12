/**
 * Global grant presets (HAS-8).
 *
 * A preset is optional, Cloud-side product metadata that prefills the
 * existing grant wizard (`apps/web/app/grants/new/page.tsx`) with
 * demo-safe, editable defaults. It never overrides onchain truth: every
 * value a preset suggests is the same plain string/number a user could
 * have typed by hand, and the wizard's own validation remains the single
 * source of truth.
 *
 * See ./README.md for the authoring contract — how to add or change a
 * preset, including for an AI-assisted edit.
 */

/** A milestone template. Percentages are whole numbers and must sum to 100. */
export type GrantPresetMilestone = {
  title: string;
  percentOfAllocation: number;
};

/** A TIME/HYBRID preset's vesting schedule, expressed in the wizard's own unit vocabulary. */
export type GrantPresetTiming = {
  unit: "60" | "3600" | "86400"; // Minutes | Hours | Days — mirrors the wizard's <select>
  cliff: string;
  duration: string;
  /** Plain-language real-world equivalent, shown in the UI (values here are demo-compressed). */
  realWorldNote: string;
};

export type GrantPreset = {
  key: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  /** Indexes `strategies`/`strategyDescriptions` in lib/protocol/grants.ts: 0=TIME, 1=MILESTONE, 2=HYBRID. */
  strategy: 0 | 1 | 2;
  titleSuggestion: string;
  descriptionSuggestion?: string;
  /** Decimal token amount, e.g. "1000". A placeholder suggestion only. */
  allocationSuggestion: string;
  /** Present for strategy 0 (TIME) and 2 (HYBRID); null for pure MILESTONE (1). */
  timing: GrantPresetTiming | null;
  /** Present for strategy 1 (MILESTONE) and 2 (HYBRID); null for pure TIME (0). */
  milestones: GrantPresetMilestone[] | null;
  /** Whether this preset's strategy expects a reviewer. Never a specific address/identity. */
  reviewerRequired: boolean;
  /** Plain-language assumptions surfaced in the UI and intended as the future AI Grant Builder's vocabulary. */
  assumptions: string[];
};

/**
 * Adding a preset is a single edit here: `GrantPresetKey` is derived from this
 * array, and `satisfies` reports any mistake on the offending entry's own line.
 * Allocations stay at or below 1000 — one `DemoToken` faucet click mints exactly
 * 1,000 hvUSD, and the wizard refuses to create a grant it cannot fully fund.
 */
export const GRANT_PRESETS = [
  {
    key: "builder-grant",
    name: "Builder Grant",
    tagline: "Every payment is a reviewer's signature.",
    description:
      "A milestone grant for an external contributor or hackathon builder. Funds unlock only as a reviewer approves each deliverable, so nothing moves without sign-off.",
    bestFor: ["Open-source contributors", "Hackathon builders", "Fixed-scope deliverables"],
    strategy: 1,
    titleSuggestion: "Builder grant",
    descriptionSuggestion: "Milestone-based grant for a scoped build.",
    allocationSuggestion: "1000",
    timing: null,
    milestones: [
      { title: "Kickoff & design", percentOfAllocation: 20 },
      { title: "Core implementation", percentOfAllocation: 50 },
      { title: "Launch & handoff", percentOfAllocation: 30 },
    ],
    reviewerRequired: true,
    assumptions: [
      "Strategy: Milestone grant — no tokens unlock until a milestone is approved.",
      "Three milestones (20% / 50% / 30%) are a starting split; rename, resize, add, or remove them freely.",
      "A reviewer wallet is required to approve milestones; choose it before funding.",
    ],
  },
  {
    key: "employee-vesting",
    name: "Employee Vesting",
    tagline: "Classic linear vesting with a cliff.",
    description:
      "Time-based vesting for a team member: nothing is claimable before the cliff, then tokens unlock linearly to the end of the schedule. No reviewer or milestones are involved.",
    bestFor: ["Core team members", "Full-time contributors"],
    strategy: 0,
    titleSuggestion: "Employee vesting",
    descriptionSuggestion: "Standard employee token vesting.",
    allocationSuggestion: "600",
    timing: {
      unit: "60",
      cliff: "1",
      duration: "4",
      realWorldNote:
        "1 minute of cliff and 4 minutes of vesting stand in for a 1-year cliff on a 4-year schedule — one demo minute per year. Switch the unit to Days for real use.",
    },
    milestones: null,
    reviewerRequired: false,
    assumptions: [
      "Strategy: Time vesting — linear unlock from the start timestamp, gated by the cliff.",
      "The schedule is compressed to one minute per year so the full cliff-to-claim cycle is watchable in a demo.",
      "No reviewer is used for time vesting; TIME grants never carry reviewer semantics.",
    ],
  },
  {
    key: "advisor-vesting",
    name: "Advisor Vesting",
    tagline: "Shorter linear vesting, no cliff required.",
    description:
      "Time-based vesting for an advisor or part-time contributor: a shorter schedule than employee vesting, typically with no cliff.",
    bestFor: ["Advisors", "Part-time contributors"],
    strategy: 0,
    titleSuggestion: "Advisor vesting",
    descriptionSuggestion: "Advisor token vesting.",
    allocationSuggestion: "400",
    timing: {
      unit: "60",
      cliff: "0",
      duration: "3",
      realWorldNote:
        "3 minutes of vesting stand in for a 3-year advisor schedule with no cliff — one demo minute per year. Switch the unit to Days for real use.",
    },
    milestones: null,
    reviewerRequired: false,
    assumptions: [
      "Strategy: Time vesting — linear unlock from the start timestamp, no cliff gate by default.",
      "With no cliff, a small amount is claimable almost immediately — useful for showing a claim on stage.",
      "No reviewer is used for time vesting; TIME grants never carry reviewer semantics.",
    ],
  },
  {
    key: "ecosystem-grant",
    name: "Ecosystem Grant",
    tagline: "Time-gated unlock, gated again by milestone sign-off.",
    description:
      "For a larger ecosystem partner: tokens must both vest over time and have each milestone approved by a reviewer. Both conditions apply, so neither a stalled reviewer nor a fast clock can release funds alone.",
    bestFor: ["Ecosystem partners", "Long-term integrations"],
    strategy: 2,
    titleSuggestion: "Ecosystem grant",
    descriptionSuggestion: "Hybrid time- and milestone-gated ecosystem grant.",
    allocationSuggestion: "800",
    timing: {
      unit: "60",
      cliff: "1",
      duration: "6",
      realWorldNote:
        "1 minute of cliff and 6 minutes of vesting stand in for a six-year partnership — one demo minute per year. Switch the unit to Days for real use.",
    },
    milestones: [
      { title: "Onboarding & integration", percentOfAllocation: 40 },
      { title: "Sustained contribution", percentOfAllocation: 60 },
    ],
    reviewerRequired: true,
    assumptions: [
      "Strategy: Hybrid — the smaller of time-vested and milestone-approved amounts is claimable. Both conditions apply.",
      "Approving a milestone before the cliff releases nothing: the time leg still gates it. This is the point of a hybrid grant.",
      "Two milestones (40% / 60%) are a starting split; rename, resize, add, or remove them freely.",
      "A reviewer wallet is required to approve milestones; choose it before funding.",
    ],
  },
] as const satisfies readonly GrantPreset[];

/** Derived from the catalog, so adding a preset is one edit in one place. */
export type GrantPresetKey = (typeof GRANT_PRESETS)[number]["key"];

export function getGrantPreset(key: GrantPresetKey): GrantPreset {
  const preset = GRANT_PRESETS.find((candidate) => candidate.key === key);
  if (!preset) throw new Error(`Unknown grant preset: ${key}`);
  return preset;
}
