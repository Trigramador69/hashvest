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
