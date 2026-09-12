# Grant presets — authoring contract

A preset is **a suggestion, not a rule**. It prefills the existing grant wizard
(`apps/web/app/grants/new/page.tsx`) with demo-safe defaults that the user can
edit or clear before any wallet request. It never becomes onchain truth: the
GrantVault stores the title, allocation, schedule, participants and milestones
the user actually submitted. The preset key travels only as optional Supabase
metadata (`organization_grants.template_key`), and only for organization-aware
creation.

This file is the contract for adding or changing a preset — by hand, or by
asking an assistant to do it. Adding a preset is a data edit plus a test run;
it should never require touching the wizard.

## Where things live

| File                | Role                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `presets.ts`        | The catalog: types + the four global presets                      |
| `apply-preset.ts`   | Pure mapping (`applyPresetToDraft`) and rules (`assertValidPreset`) |
| `*.test.ts`         | Catalog integrity, mapping, and invalid-combination coverage       |

`lib/shared` is layer-neutral: this module must import **neither** `@/lib/cloud`
nor `@/lib/protocol` (`scripts/check-boundary.mjs` fails CI otherwise). That is
why `apply-preset.ts` uses `viem` directly instead of reusing `parseAllocation`
from `lib/protocol`. The check matches on the `@/lib/...` alias, so a relative
import would slip past it — that is still a boundary violation
(`docs/architecture.md`), not a loophole to use.

## The rules `assertValidPreset` enforces

Strategy is a number because it mirrors the onchain `UnlockStrategy` enum in
`packages/contracts/src/GrantTypes.sol`:

| `strategy` | Meaning        | `timing`  | `milestones`      | `reviewerRequired` |
| ---------- | -------------- | --------- | ----------------- | ------------------ |
| `0`        | Time vesting   | required  | must be `null`    | must be `false`    |
| `1`        | Milestone grant| must be `null` | 1–20, percentages sum to 100 | must be `true` |
| `2`        | Hybrid         | required  | 1–20, sum to 100  | must be `true`     |

Also enforced: `duration` is a positive whole number, `cliff` is nonnegative and
never longer than `duration`, every milestone has a title and a positive percent.

**`strategy: 0` must never carry a reviewer.** The vault writes the zero address
as the reviewer for time vesting, so suggesting one would be a visible lie in the
UI. This is an explicit HAS-8 acceptance criterion, not a style preference.

## Demo-compressed schedules

`timing.unit` is the wizard's own `<select>` value in seconds: `"60"` minutes,
`"3600"` hours, `"86400"` days. The shipped presets use **minutes** so the full
vest→claim cycle is watchable in a live demo. Each preset states its real-world
equivalent in `timing.realWorldNote`, which the UI shows next to the schedule, so
nobody mistakes a 20-minute default for a real vesting policy. A production
deployment would switch `unit` to `"86400"` and scale the numbers.

## Milestone percentages, not amounts

Milestones are stored as `percentOfAllocation` (integers summing to 100) because
the allocation is only known once the user types it. `splitAllocationByPercent`
converts them in base units and gives the rounding remainder to the last
milestone, so the amounts always sum to exactly the allocation — the wizard
rejects anything else ("Milestone amounts must add up exactly to the total
allocation").

## Adding a preset

1. Add one `GrantPreset` object to `GRANT_PRESETS` in `presets.ts`. `GrantPresetKey`
   is derived from that array and `satisfies` reports mistakes on the offending
   entry's own line, so this is the only place the preset is declared.
2. Add its `key` to `expectedKeys` in `presets.test.ts`.
3. Run `pnpm --filter @hashvest/web test`. `assertValidCatalog` runs over the whole
   catalog, so an invalid combination fails there rather than in the demo.

No wizard change is needed: the picker renders whatever is in `GRANT_PRESETS`.
**Validity is whatever `assertValidPreset` accepts — read that function, not this
prose.** Two things it cannot check for you:

- `allocationSuggestion` must stay at or below **1000**. One `DemoToken` faucet
  click mints exactly 1,000 hvUSD, and `createGrant` refuses to create a grant the
  issuer cannot fully fund.
- Never set a start date. Presets always leave it empty so the schedule begins at
  the creation transaction's own timestamp. There is no field for it.

### Worked example — and the unit trap

Request: *"add a Community Ambassador preset, monthly vesting over a year."*

Reasoning: time vesting only → `strategy: 0` → `timing` required, `milestones: null`,
`reviewerRequired: false`.

Now the trap. Every shipped preset uses `unit: "60"` (minutes) because those four
are **demo-compressed on purpose**, at roughly one demo minute per real year. Do
not copy that convention onto a new preset without deciding: the schedule is
whatever `cliff` and `duration` mean *in the unit you choose*. "Over a year" is
`unit: "86400"` (Days) with `duration: "365"` — it is **not** `duration: "365"` in
minutes, and it is not "12 months" either, because the contract vests linearly and
has no notion of a month. Pick the real schedule first, then decide whether this
preset is a demo prop (compress it, and say so in `realWorldNote`) or a real policy
(use Days and say that instead).

```ts
{
  key: "community-ambassador",
  name: "Community Ambassador",
  tagline: "Steady unlock across a one-year program.",
  description:
    "Time-based vesting for a community ambassador: tokens unlock linearly across the program, with no cliff and no reviewer.",
  bestFor: ["Community ambassadors", "Ongoing part-time programs"],
  strategy: 0,
  titleSuggestion: "Community ambassador program",
  descriptionSuggestion: "One-year ambassador allocation.",
  allocationSuggestion: "500",
  timing: {
    unit: "86400", // Days — a real schedule, not a demo prop
    cliff: "0",
    duration: "365",
    realWorldNote:
      "A one-year program vesting linearly with no cliff. Unlike the four demo presets, this schedule is in real days.",
  },
  milestones: null,
  reviewerRequired: false,
  assumptions: [
    "Strategy: Time vesting — linear unlock, no cliff.",
    "The schedule runs in real days, so nothing meaningful unlocks during a live demo.",
    "No reviewer is used for time vesting.",
  ],
}
```

## Writing the copy

The prose fields are the product, not decoration — they are what makes a preset
understandable at a glance, and they are the vocabulary the future AI Grant
Builder (HAS-16 / HAS-18) will draft against.

- `tagline` — one line, what the money does. Not the audience.
- `description` — two sentences: the mechanism, then what it protects against.
- `bestFor` — 2–3 concrete roles, not adjectives.
- `assumptions` — every non-obvious choice the preset made **for** the user, each
  one something they can act on. Always name the strategy in the first entry, and
  always disclose the demo compression when `timing` is minute-scale. An AI draft
  built on this schema is expected to surface exactly these as its assumptions.

Avoid implying guarantees the protocol does not make: presets cannot revoke,
cannot claw back, and cannot change terms after creation.
