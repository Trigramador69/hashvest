/**
 * English is the source of truth. Its keys define `TranslationKey`, so every
 * other locale is typed against this object and can only ever be a subset.
 *
 * Keys are flat and dot-namespaced by surface (`shell.*`, `session.*`, …).
 * Placeholders use `{name}` and are substituted verbatim, which is how
 * technical literals — wallet addresses, transaction hashes, contract
 * identifiers, token symbols, chain ids, explorer URLs — stay out of
 * translation entirely. Never inline such a literal into a message string.
 */
export const en = {
  // Shell: header, navigation, footer.
  "shell.home": "HashVest home",
  "shell.nav.label": "Main navigation",
  "shell.nav.organizations": "Organizations / grants",
  "shell.nav.createGrant": "Create grant",
  "shell.workspace.label": "Workspace",
  "shell.workspace.choose": "Choose workspace",
  "shell.workspace.yours": "Your organizations",
  "shell.workspace.create": "+ Create organization",
  "shell.footer.tagline": "Programmable grants on HashKey Chain",
  "shell.footer.disclaimer": "Hackathon MVP · Unaudited · Testnet assets only",

  // Locale selector.
  "locale.label": "Language",
  "locale.choose": "Choose language",

  // Workspace session (SIWE). Wallet-facing, never fund-facing.
  "session.enabled": "Workspace access enabled",
  "session.signOut": "Sign out of workspace",
  "session.signingOut": "Signing out…",
  "session.signIn": "Sign in to workspace",
  "session.signingIn": "Signing in…",
  "session.required": "Wallet connected, workspace sign-in required.",
  "session.walletChanged": "Wallet changed. Sign in again to continue.",
  "session.switchNetwork": "Switch to {network} first.",
  "session.switchNetworkChain":
    "Switch your wallet to {network} (chain {chainId}) first.",
  "session.notConfigured":
    "Workspace auth is not configured on this server yet.",

  // Wallet status panel.
  "wallet.notConnected": "Not connected",
  "wallet.label": "Wallet",
  "wallet.selectedChain": "Selected chain",
  "wallet.unknownChain": "Chain {chainId}",

  // Landing page.
  "home.eyebrow": "Programmable grants · HashKey Chain",
  "home.headline.line1": "Fund the work.",
  "home.headline.line2": "Define the unlock.",
  "home.lede":
    "HashVest turns token allocations into fully funded grants that unlock with time, milestones, or both.",
  "home.cta.openApp": "Open application",
  "home.cta.createGrant": "Create a grant",
  "home.note": "Live on {network} · ERC20 tokens · No revocation",

  "home.steps.title": "One allocation. Clear conditions.",
  "home.steps.fund.title": "Treasury funds a vault",
  "home.steps.fund.body": "The full allocation is deposited at creation.",
  "home.steps.unlock.title": "Conditions unlock tokens",
  "home.steps.unlock.body": "A fixed schedule, reviewer approval, or both.",
  "home.steps.claim.title": "Beneficiary claims",
  "home.steps.claim.body": "Only the recipient can withdraw unlocked tokens.",

  "home.strategies.title": "Built for every kind of contribution.",
  "home.strategies.audience":
    "Ecosystem builders · Teams · Advisors · Contributors",
  "home.strategies.time.title": "Time vesting",
  "home.strategies.time.subtitle": "Reward sustained commitment.",
  "home.strategies.time.body":
    "Tokens vest linearly from the start. An optional cliff delays access without resetting the curve.",
  "home.strategies.milestone.title": "Milestone grants",
  "home.strategies.milestone.subtitle": "Fund measurable progress.",
  "home.strategies.milestone.body":
    "A designated reviewer approves fixed milestones. Each approval unlocks its exact allocation.",
  "home.strategies.hybrid.title": "Hybrid grants",
  "home.strategies.hybrid.subtitle": "Keep time and delivery aligned.",
  "home.strategies.hybrid.body":
    "Unlocked = min(time vested, approved milestone amount). Both conditions constrain every claim.",

  // Grant strategies. Indexes match lib/protocol/grants.ts: 0=TIME, 1=MILESTONE,
  // 2=HYBRID. The protocol module keeps the English values as data; the copy a
  // reader sees comes from here.
  "strategy.0.name": "Time vesting",
  "strategy.1.name": "Milestone grant",
  "strategy.2.name": "Hybrid",
  "strategy.0.description":
    "Unlock linearly over time. A cliff delays access without restarting the schedule.",
  "strategy.1.description":
    "Unlock fixed allocations as your reviewer approves each milestone.",
  "strategy.2.description":
    "Unlock the smaller of time vested and approved milestone amounts. Both conditions apply.",

  // Preset picker in the grant wizard.
  "wizard.preset.title": "Start from a preset",
  "wizard.preset.lede":
    "Optional. A preset fills in a strategy, schedule, and milestone split that you can edit or clear. It never changes what the vault stores.",
  "wizard.preset.custom.name": "Custom / blank",
  "wizard.preset.custom.tagline":
    "Configure every value yourself, exactly as before.",
  "wizard.preset.custom.meta": "Clears the fields a preset filled in",
  "wizard.preset.needsReviewer": "needs a reviewer",

  // Grant presets (HAS-8). Keys mirror the catalog in
  // lib/shared/grant-presets/presets.ts and are resolved through
  // localizeGrantPreset(); the catalog's own English values are the fallback.
  // Percentages, allocations, schedule units and strategy indexes are data,
  // not copy, and are never translated.
  "preset.builder-grant.name": "Builder Grant",
  "preset.builder-grant.tagline": "Every payment is a reviewer's signature.",
  "preset.builder-grant.description":
    "A milestone grant for an external contributor or hackathon builder. Funds unlock only as a reviewer approves each deliverable, so nothing moves without sign-off.",
  "preset.builder-grant.bestFor.0": "Open-source contributors",
  "preset.builder-grant.bestFor.1": "Hackathon builders",
  "preset.builder-grant.bestFor.2": "Fixed-scope deliverables",
  "preset.builder-grant.titleSuggestion": "Builder grant",
  "preset.builder-grant.descriptionSuggestion":
    "Milestone-based grant for a scoped build.",
  "preset.builder-grant.milestone.0.title": "Kickoff & design",
  "preset.builder-grant.milestone.1.title": "Core implementation",
  "preset.builder-grant.milestone.2.title": "Launch & handoff",
  "preset.builder-grant.assumption.0":
    "Strategy: Milestone grant — no tokens unlock until a milestone is approved.",
  "preset.builder-grant.assumption.1":
    "Three milestones (20% / 50% / 30%) are a starting split; rename, resize, add, or remove them freely.",
  "preset.builder-grant.assumption.2":
    "A reviewer wallet is required to approve milestones; choose it before funding.",

  "preset.employee-vesting.name": "Employee Vesting",
  "preset.employee-vesting.tagline": "Classic linear vesting with a cliff.",
  "preset.employee-vesting.description":
    "Time-based vesting for a team member: nothing is claimable before the cliff, then tokens unlock linearly to the end of the schedule. No reviewer or milestones are involved.",
  "preset.employee-vesting.bestFor.0": "Core team members",
  "preset.employee-vesting.bestFor.1": "Full-time contributors",
  "preset.employee-vesting.titleSuggestion": "Employee vesting",
  "preset.employee-vesting.descriptionSuggestion":
    "Standard employee token vesting.",
  "preset.employee-vesting.timing.realWorldNote":
    "1 minute of cliff and 4 minutes of vesting stand in for a 1-year cliff on a 4-year schedule — one demo minute per year. Switch the unit to Days for real use.",
  "preset.employee-vesting.assumption.0":
    "Strategy: Time vesting — linear unlock from the start timestamp, gated by the cliff.",
  "preset.employee-vesting.assumption.1":
    "The schedule is compressed to one minute per year so the full cliff-to-claim cycle is watchable in a demo.",
  "preset.employee-vesting.assumption.2":
    "No reviewer is used for time vesting; TIME grants never carry reviewer semantics.",

  "preset.advisor-vesting.name": "Advisor Vesting",
  "preset.advisor-vesting.tagline":
    "Shorter linear vesting, no cliff required.",
  "preset.advisor-vesting.description":
    "Time-based vesting for an advisor or part-time contributor: a shorter schedule than employee vesting, typically with no cliff.",
  "preset.advisor-vesting.bestFor.0": "Advisors",
  "preset.advisor-vesting.bestFor.1": "Part-time contributors",
  "preset.advisor-vesting.titleSuggestion": "Advisor vesting",
  "preset.advisor-vesting.descriptionSuggestion": "Advisor token vesting.",
  "preset.advisor-vesting.timing.realWorldNote":
    "3 minutes of vesting stand in for a 3-year advisor schedule with no cliff — one demo minute per year. Switch the unit to Days for real use.",
  "preset.advisor-vesting.assumption.0":
    "Strategy: Time vesting — linear unlock from the start timestamp, no cliff gate by default.",
  "preset.advisor-vesting.assumption.1":
    "With no cliff, a small amount is claimable almost immediately — useful for showing a claim on stage.",
  "preset.advisor-vesting.assumption.2":
    "No reviewer is used for time vesting; TIME grants never carry reviewer semantics.",

  "preset.ecosystem-grant.name": "Ecosystem Grant",
  "preset.ecosystem-grant.tagline":
    "Time-gated unlock, gated again by milestone sign-off.",
  "preset.ecosystem-grant.description":
    "For a larger ecosystem partner: tokens must both vest over time and have each milestone approved by a reviewer. Both conditions apply, so neither a stalled reviewer nor a fast clock can release funds alone.",
  "preset.ecosystem-grant.bestFor.0": "Ecosystem partners",
  "preset.ecosystem-grant.bestFor.1": "Long-term integrations",
  "preset.ecosystem-grant.titleSuggestion": "Ecosystem grant",
  "preset.ecosystem-grant.descriptionSuggestion":
    "Hybrid time- and milestone-gated ecosystem grant.",
  "preset.ecosystem-grant.timing.realWorldNote":
    "1 minute of cliff and 6 minutes of vesting stand in for a six-year partnership — one demo minute per year. Switch the unit to Days for real use.",
  "preset.ecosystem-grant.milestone.0.title": "Onboarding & integration",
  "preset.ecosystem-grant.milestone.1.title": "Sustained contribution",
  "preset.ecosystem-grant.assumption.0":
    "Strategy: Hybrid — the smaller of time-vested and milestone-approved amounts is claimable. Both conditions apply.",
  "preset.ecosystem-grant.assumption.1":
    "Approving a milestone before the cliff releases nothing: the time leg still gates it. This is the point of a hybrid grant.",
  "preset.ecosystem-grant.assumption.2":
    "Two milestones (40% / 60%) are a starting split; rename, resize, add, or remove them freely.",
  "preset.ecosystem-grant.assumption.3":
    "A reviewer wallet is required to approve milestones; choose it before funding.",

  // Document metadata.
  "meta.title": "HashVest — Programmable grants",
  "meta.description":
    "Fully funded token grants with time, milestone, and hybrid unlocks on HashKey Chain.",
} as const;

/**
 * Every translatable key in the product. Adding a key here without translating
 * it is safe — it falls back to English. Removing one breaks the other locales
 * at compile time, which is the intent.
 */
export type TranslationKey = keyof typeof en;

/** Shape every non-default locale must satisfy: a subset of English. */
export type TranslationDictionary = Partial<Record<TranslationKey, string>>;
