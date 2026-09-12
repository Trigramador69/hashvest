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

  // Grant surfaces: shared UI (grant-ui), cards, and the grant detail page. Addresses, hashes, block numbers, token symbols and RPC URLs arrive as values.
  "role.Issuer": "Issuer",
  "role.Beneficiary": "Beneficiary",
  "role.Reviewer": "Reviewer",
  "party.issuer": "Issuer",
  "party.beneficiary": "Beneficiary",
  "party.reviewer": "Reviewer",
  "party.token": "Token",
  "ui.wallet.providerUnavailableRepair": "Your wallet provider is unavailable.",
  "ui.connect.title": "Connect a wallet to get started",
  "ui.connect.body":
    "Connect your issuer, beneficiary, or reviewer wallet. All grants live on {network}.",
  "ui.switch.title": "Switch to {network}",
  "ui.switch.body":
    "Your wallet is on another network. Transactions are enabled only on chain {chainId}.",
  "ui.switch.switching": "Switching…",
  "ui.switch.action": "Switch to {network}",
  "ui.rpc.title": "Your {network} wallet RPC is unavailable",
  "ui.rpc.body.before":
    "The wallet reports chain {chainId}, but its RPC cannot read the latest block. HashVest uses the canonical HSK endpoint at ",
  "ui.rpc.body.after":
    ". A stale third-party RPC can make a valid token approval look like a contract revert.",
  "ui.rpc.updating": "Updating wallet RPC…",
  "ui.rpc.action": "Use canonical HSK RPC",
  "ui.rpc.manual.before":
    "If your wallet rejects the update, edit {network} manually: RPC URL ",
  "ui.rpc.manual.middle": ", chain ID ",
  "ui.rpc.manual.after": ".",
  "ui.address.copy": "Copy {address}",
  "ui.address.copied": "Copied",
  "ui.address.copyAction": "Copy",
  "ui.address.copyUnavailable": "Copy unavailable; select the address.",
  "ui.tx.confirmed": "confirmed",
  "ui.tx.submitted": "submitted",
  "ui.lifecycle.completed": "Completed",
  "ui.lifecycle.active": "Active",
  "ui.funding.title": "Funding health",
  "ui.funding.percent": "{percent}% funded",
  "ui.funding.healthy": "Healthy",
  "ui.funding.underfunded": "Underfunded",
  "ui.funding.progressLabel": "Grant funding health",
  "ui.funding.allocation": "Allocation",
  "ui.funding.vaultBalance": "Vault balance",
  "ui.funding.required": "Required after claims",
  "ui.funding.shortfall": "Shortfall: {amount}",
  "ui.funding.surplus":
    "Extra vault balance: {amount}. This is outside the fixed allocation.",
  "card.loading": "Loading grant {address}…",
  "card.error.title": "Grant could not be loaded",
  "card.stale.title": "Live grant state is unavailable",
  "card.stale.body":
    "The last HSK read could not be refreshed, so current values are hidden.",
  "card.retry": "Retry",
  "card.totalAllocation": "Total allocation",
  "card.unlocked": "Unlocked",
  "card.unlockedProgress": "Grant unlocked",
  "card.milestonesToReview.one": "{count} milestone to review",
  "card.milestonesToReview.other": "{count} milestones to review",
  "card.availableToClaim": "Available to claim",
  "card.claimable": "Claimable",
  "detail.loading.title": "Loading grant",
  "detail.loading.body": "Reading the vault and token on {network}…",
  "detail.back": "My grants",
  "detail.error.title": "Unable to read this grant",
  "detail.error.body":
    "Check that this is a HashVest GrantVault on {network}. The RPC may also be temporarily unavailable.",
  "detail.stale.title": "Live grant state is unavailable",
  "detail.stale.body":
    "The last HSK read could not be refreshed, so current grant values are hidden until the live state is available again.",
  "detail.retry": "Retry",
  "detail.eyebrow": "Grant vault · {network}",
  "detail.youAre.Issuer": "You are the issuer",
  "detail.youAre.Beneficiary": "You are the beneficiary",
  "detail.youAre.Reviewer": "You are the reviewer",
  "detail.stat.totalAllocated": "Total allocated",
  "detail.stat.unlocked": "Unlocked",
  "detail.stat.claimable": "Claimable",
  "detail.stat.claimed": "Claimed",
  "detail.schedule.title": "Vesting schedule",
  "detail.schedule.lede":
    "Linear from the start. The cliff delays claiming without restarting the curve.",
  "detail.schedule.vestedByTime": "{amount} vested by time",
  "detail.schedule.progressLabel": "Time vested",
  "detail.schedule.start": "Start",
  "detail.schedule.cliffReached": "Cliff reached",
  "detail.schedule.fullyVested": "Fully vested",
  "detail.hybrid.formula": "Hybrid = min(time vested, approved milestones)",
  "detail.hybrid.timeVested": "Time vested: {amount}",
  "detail.hybrid.milestonesApproved": "Milestones approved: {amount}",
  "detail.hybrid.unlocked": "Unlocked: {amount}",
  "detail.milestones.title": "Milestones",
  "detail.milestones.summary": "{approved} of {total} approved · {amount}",
  "detail.milestone.approved": "Approved",
  "detail.milestone.pending": "Pending",
  "detail.milestone.approveAction": "Approve milestone",
  "detail.terms.title": "Grant terms",
  "detail.terms.fixed":
    "Terms and allocation are fixed. This grant cannot be revoked.",
  "detail.claim.title": "Ready to claim",
  "detail.claim.pending": "Transaction in progress…",
  "detail.claim.action": "Claim {amount}",
  "detail.claim.beneficiaryBalance": "Beneficiary token balance",
  "detail.eligibility.title": "Eligibility",
  "detail.eligibility.none":
    "No provider configured. Claims do not require an eligibility check.",
  "detail.eligibility.unavailable": "Provider unavailable",
  "detail.eligibility.eligible": "Beneficiary is eligible",
  "detail.eligibility.notEligible": "Beneficiary is not eligible",
  "detail.eligibility.note":
    "The provider controls beneficiary eligibility. The demo adapter is not real KYC or compliance.",
  "detail.footer.block": "Live contract reads · Block {block}",
  "detail.footer.refresh":
    "Refreshes every {seconds} seconds and after transactions.",
  "detail.tx.claim": "Claim tokens",
  "detail.tx.approveMilestone": "Approve milestone {index}",
  "detail.rpcUnavailable": "{network} RPC is unavailable.",
  "detail.claimReason.connect":
    "Connect the beneficiary wallet to claim tokens.",
  "detail.claimReason.providerError":
    "The eligibility provider could not be read. Claims remain blocked until it is available.",
  "detail.claimReason.notEligible":
    "The configured provider has not marked the beneficiary eligible.",
  "detail.claimReason.completed": "The full allocation has been claimed.",
  "detail.claimReason.awaitingMilestone":
    "Waiting for the reviewer to approve a milestone.",
  "detail.claimReason.awaitingCliff":
    "Tokens are waiting for the vesting start or cliff.",
  "detail.claimReason.allClaimed":
    "All currently unlocked tokens have been claimed. More time or milestone progress is needed.",
  "detail.claimReason.ready":
    "Claim the currently unlocked amount directly to your beneficiary wallet.",

  // Grant wizard (/grants/new). Token symbols, decimals, chain ids, addresses and the isEligible(address) signature are literals passed in as values.
  "wizard.eyebrow": "New allocation",
  "wizard.title.create": "Create a grant.",
  "wizard.title.created": "Your grant is live.",
  "wizard.lede.create":
    "Set the terms once. Fund the full allocation. Let the conditions do the rest.",
  "wizard.lede.created":
    "The full token allocation is in its own vault on {network}.",
  "wizard.notice.organization.title": "Creating for {organization}",
  "wizard.notice.organization.body":
    "Onchain title, allocation, participants, and permissions remain in the GrantVault. The optional description is saved as workspace metadata after the confirmed transaction.",
  "wizard.notice.noDeployment.title": "Testnet deployment is not configured",
  "wizard.notice.noDeployment.body":
    "Grant creation will be available after the HashVest contracts are deployed and synchronized.",
  "wizard.sync.pending.title": "Saving workspace metadata",
  "wizard.sync.pending.body":
    "The HSK transaction is confirmed. Linking this grant to the workspace…",
  "wizard.sync.saved":
    "Workspace metadata saved. The grant is now visible in this organization.",
  "wizard.sync.failed.title": "Grant created successfully onchain",
  "wizard.sync.failed.body":
    "Workspace metadata could not be saved. The GrantVault and its funds remain live; retry the workspace sync without creating another grant.",
  "wizard.sync.retrying": "Retrying sync…",
  "wizard.sync.retry": "Retry workspace sync",
  "wizard.openGrant": "Open grant",
  "wizard.confirmed.before":
    "The transaction confirmed. Find your new grant on the ",
  "wizard.confirmed.link": "Issued dashboard",
  "wizard.confirmed.after": ".",
  "wizard.progress": "Creation progress",
  "wizard.step.0": "Grant",
  "wizard.step.1": "Strategy",
  "wizard.step.2": "Conditions",
  "wizard.step.3": "Review",
  "wizard.stepTitle.0": "Who is this grant for?",
  "wizard.stepTitle.1": "Choose how tokens unlock",
  "wizard.stepTitle.2": "Set the conditions",
  "wizard.stepTitle.3": "Review before funding",
  "wizard.field.title.label": "Grant title",
  "wizard.field.title.hint":
    "For example: Ecosystem builder grant or Contributor allocation.",
  "wizard.field.title.placeholder": "Ecosystem builder grant",
  "wizard.field.beneficiary.label": "Beneficiary",
  "wizard.field.beneficiary.hint":
    "The selected member's exact wallet becomes the onchain beneficiary. Only that wallet can claim.",
  "wizard.field.beneficiaryWallet.label": "Beneficiary wallet",
  "wizard.field.beneficiaryWallet.hint":
    "Only this address can claim unlocked tokens. Double-check it.",
  "wizard.members.unavailable":
    "The member directory is unavailable. You can still use an external wallet while workspace metadata recovers.",
  "wizard.field.description.label": "Workspace description",
  "wizard.field.description.hint":
    "Optional product context. It does not replace the onchain title.",
  "wizard.field.description.placeholder":
    "Support for the HSK developer ecosystem.",
  "wizard.field.token.label": "ERC20 token address",
  "wizard.field.token.hint":
    "Use a normal ERC20 on {network}. Native HSK and fee-on-transfer tokens are unsupported.",
  "wizard.token.useDemo": "Use demo {symbol}",
  "wizard.token.reading": "Reading token metadata on {network}…",
  "wizard.token.error":
    "Could not read this token. Confirm the address and network.",
  "wizard.token.decimals": "{symbol} · {decimals} decimals",
  "wizard.field.allocation.label": "Total allocation",
  "wizard.field.allocation.hint":
    "Enter token units, not base units. The full amount is transferred into the vault.",
  "wizard.schedule.title": "Vesting schedule",
  "wizard.schedule.lede":
    "Vesting is linear from the start. At the cliff, the elapsed portion becomes available.",
  "wizard.schedule.demoTip":
    "Demo tip: use a 5-minute duration and a 0-minute cliff.",
  "wizard.field.start.label": "Start date (optional)",
  "wizard.field.start.hint":
    "Your local timezone. Leave empty to start at the creation transaction timestamp. A past start releases its elapsed portion immediately.",
  "wizard.field.unit.label": "Schedule unit",
  "wizard.unit.minutes": "Minutes",
  "wizard.unit.hours": "Hours",
  "wizard.unit.days": "Days",
  "wizard.field.cliff.label": "Cliff",
  "wizard.field.duration.label": "Total duration",
  "wizard.field.reviewer.label": "Reviewer",
  "wizard.field.reviewer.hint":
    "The selected member's exact wallet becomes the onchain reviewer for milestone approvals.",
  "wizard.field.reviewerWallet.label": "Reviewer wallet",
  "wizard.field.reviewerWallet.hint":
    "This wallet may approve milestones. Amounts and terms cannot be edited.",
  "wizard.milestones.title": "Milestones",
  "wizard.milestones.lede":
    "Amounts must total exactly {amount} {symbol}. Up to {max} milestones.",
  "wizard.milestones.theAllocation": "the allocation",
  "wizard.milestones.add": "Add milestone +",
  "wizard.milestone.index": "Milestone {index}",
  "wizard.milestone.remove": "Remove",
  "wizard.field.milestoneTitle.label": "Title",
  "wizard.field.milestoneTitle.placeholder": "Deliver working prototype",
  "wizard.field.milestoneAmount.label": "Amount ({symbol})",
  "wizard.field.milestoneAmount.fallbackSymbol": "tokens",
  "wizard.advanced.summary": "Advanced · optional eligibility provider",
  "wizard.field.eligibility.label": "Eligibility provider address",
  "wizard.field.eligibility.hint":
    "Leave empty for no eligibility check. The provider must implement isEligible(address). This demo adapter is not KYC or compliance.",
  "wizard.field.eligibility.placeholder": "None",
  "wizard.review.fromPreset":
    "Started from the {preset} preset. That is workspace metadata only — the terms below are what goes onchain.",
  "wizard.review.issuer": "Issuer",
  "wizard.review.beneficiary": "Beneficiary",
  "wizard.review.token": "Token",
  "wizard.review.reviewer": "Reviewer",
  "wizard.review.start": "Start",
  "wizard.review.startCreation": "Creation timestamp",
  "wizard.review.cliffDuration": "Cliff / total duration",
  "wizard.review.eligibility": "Eligibility provider",
  "wizard.review.eligibilityNone": "None — disabled",
  "wizard.review.permanent.title": "These terms are permanent",
  "wizard.review.permanent.body":
    "No revocation, withdrawals by the issuer, or changes to grant economics. You will approve token spending if needed, then create and fully fund the vault in one transaction.",
  "wizard.nav.back": "Back",
  "wizard.nav.continue": "Continue",
  "wizard.nav.pending": "Transaction in progress…",
  "wizard.nav.submit": "Approve & create grant",
  "wizard.walletChanged":
    "Wallet changed. Go back and review with the current issuer.",
  "wizard.tx.resetAllowance": "Reset token allowance",
  "wizard.tx.approve": "Approve token spending",
  "wizard.tx.create": "Create and fund grant",
  "wizard.error.title": "Give your grant a title.",
  "wizard.error.beneficiaryMember":
    "Choose a beneficiary member or use an external wallet.",
  "wizard.error.beneficiaryAddress":
    "Enter a valid, nonzero beneficiary address.",
  "wizard.error.token":
    "Enter a valid ERC20 contract address. Native HSK is not supported.",
  "wizard.error.tokenMetadata":
    "Wait for the ERC20 symbol and decimals to load. Check that the token is deployed on {network}.",
  "wizard.error.issuerWallet": "Connect the issuer wallet before reviewing.",
  "wizard.error.duration": "Duration must be a positive whole number.",
  "wizard.error.cliff": "Cliff must be a nonnegative whole number.",
  "wizard.error.cliffTooLong":
    "Cliff cannot be longer than the total duration.",
  "wizard.error.durationTooLarge": "Duration is too large.",
  "wizard.error.startDate": "Enter a valid start date.",
  "wizard.error.eligibility":
    "Enter a valid eligibility provider address or leave it empty.",
  "wizard.error.reviewerMember":
    "Choose a reviewer member or use an external wallet.",
  "wizard.error.reviewerRequired":
    "Milestone and hybrid grants require a reviewer address.",
  "wizard.error.milestoneCount": "Add between 1 and {max} milestones.",
  "wizard.error.milestoneSum":
    "Milestone amounts must add up exactly to the total allocation.",
  "wizard.error.reviewFirst":
    "Review the grant and check the Testnet deployment before continuing.",
  "wizard.error.eligibilityNoCode":
    "Eligibility provider has no contract code on {network}.",
  "wizard.error.reviewAgain":
    "Review the grant again before syncing workspace metadata.",
  "wizard.error.walletChangedSync":
    "Wallet changed. Sign in again with the issuing wallet before syncing workspace metadata.",

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
