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
  "shell.footer.tagline": "Programmable grants on HashKey Chain",
  "shell.footer.disclaimer": "Hackathon MVP · Unaudited · Testnet assets only",
  "shell.nav.overview": "Overview",
  "shell.nav.grants": "Grants",
  "shell.nav.settings": "Settings",
  "shell.navigation.open": "Open navigation",
  "shell.navigation.close": "Close navigation",
  "shell.appTagline": "HashVest · HSK Testnet",
  "shell.appDisclaimer": "Unaudited · Testnet assets only",

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

  // Landing page.
  "home.eyebrow": "Programmable grants · HashKey Chain",
  "home.headline.line1": "Fund the work.",
  "home.headline.line2": "Define the unlock.",
  "home.lede":
    "HashVest turns token allocations into fully funded grants that unlock with time, milestones, or both.",
  "home.cta.openApp": "Open application",
  "home.cta.createGrant": "Create a grant",
  "home.note":
    "Live on {network} · ERC20 tokens · Optional issuer revocation · Earned value protected",

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

  // Revocation (HAS-26), transaction stages, and validation raised from lib/protocol.
  "ui.lifecycle.revoked": "Revoked",
  "party.terms": "Terms",
  "tx.stage.confirm": "{label}: confirm in your wallet",
  "tx.stage.waiting": "{label}: waiting for confirmation",
  "tx.stage.confirmed": "Transaction confirmed. Onchain state is up to date.",
  "tx.stage.reverted":
    "{label} reverted onchain. No changes from this transaction were applied.",
  "tx.error.notConnected": "Connect your wallet to continue.",
  "tx.error.wrongNetwork":
    "Switch your wallet to {network} (chain {chainId}) to continue.",
  "tx.error.walletChanged":
    "Your wallet changed. Review the grant again before continuing.",
  "tx.error.rpcUnavailable": "{network} RPC is unavailable.",
  "ui.error.requestFailed": "The request failed. Please try again.",
  "tx.error.tokenAddressRequired": "Token address is required.",
  "grants.error.decimals":
    "This token supports at most {decimals} decimal places.",
  "wizard.error.amountFormat": "Enter a positive decimal token amount.",
  "wizard.error.amountRange": "Token amount is outside the supported range.",
  "wizard.error.milestoneTitle": "Milestone {index} needs a title.",
  "wizard.error.insufficientBalance":
    "Insufficient {symbol}. The full allocation must be funded at creation.",
  "wizard.error.memberMismatch.beneficiary":
    "Choose a beneficiary from the organization directory or use an external wallet.",
  "wizard.error.memberMismatch.reviewer":
    "Choose a reviewer from the organization directory or use an external wallet.",
  "wizard.field.revocable.label": "Revocable grant",
  "wizard.field.revocable.hint":
    "Enables issuer clawback of unearned tokens. Tokens already earned or claimed by the beneficiary remain strictly preserved and protected.",
  "wizard.review.revocable.title": "Revocable grant terms",
  "wizard.review.revocable.body":
    "This grant is revocable by the issuer. Revocation claws back unearned funds to your wallet while strictly preserving any value already earned or claimed by the beneficiary.",
  "detail.terms.revocable": "Revocable",
  "detail.terms.revocableRevoked": "Revocable (Revoked)",
  "detail.terms.nonRevocable": "Non-revocable (Immutable)",
  "detail.terms.revocableNote":
    "This grant is revocable by the issuer for unearned tokens.",
  "detail.terms.revokedNote":
    "Revocable grant: revoked on {date}. Beneficiary earned entitlement is strictly preserved.",
  "detail.badge.revocable": "Revocable",
  "detail.badge.nonRevocable": "Non-revocable",
  "detail.claimReason.revokedAllClaimed":
    "The grant was revoked. All earned tokens have already been claimed.",
  "detail.claimReason.revokedClaimable":
    "The grant was revoked by the issuer. You can claim all remaining earned tokens.",
  "detail.milestone.lockedByRevocation": "Grant revoked; milestones locked.",
  "detail.revoked.title": "Grant Revoked on {date}",
  "detail.revoked.body.before":
    "This grant was revoked by the issuer. The beneficiary's earned entitlement was locked at ",
  "detail.revoked.body.middle":
    " at the time of revocation. Unearned tokens ({recovered}) were recovered by the issuer.",
  "detail.revoked.body.claimable":
    " The beneficiary preserves the remaining {amount} of earned value and can claim it below.",
  "detail.revoked.body.allClaimed": " All earned tokens have been claimed.",
  "detail.revoke.action": "Revoke grant",
  "detail.revoke.tx": "Revoke grant and recover unearned tokens",
  "detail.revoke.modal.title": "Confirm Grant Revocation",
  "detail.revoke.modal.lede":
    "Preview the clawback and preserved entitlements before confirming.",
  "detail.revoke.modal.totalAllocation": "Total Allocation:",
  "detail.revoke.modal.alreadyClaimed": "Already Claimed by Beneficiary:",
  "detail.revoke.modal.earnedEntitlement": "Beneficiary Earned Entitlement:",
  "detail.revoke.modal.earnedUnclaimed": "Earned but Unclaimed:",
  "detail.revoke.modal.clawback": "Issuer Treasury Clawback:",
  "detail.revoke.modal.warningLabel": "Irreversible Action:",
  "detail.revoke.modal.warningBody":
    "Revoking stops all future vesting and milestone approvals permanently. Tokens already earned or claimed by the beneficiary remain strictly in their custody or claimable. Unearned tokens ({recovered}) will return immediately to your connected wallet.",
  "detail.revoke.modal.cancel": "Cancel",
  "detail.revoke.modal.confirm": "Confirm Clawback",
  "detail.revoke.modal.pending": "Clawing back…",
  "card.revocable": "Revocable",
  "card.nonRevocable": "Non-revocable",

  // Organization overview: live metrics, review and claimable queues, grant linking.
  "overview.loading.title": "Loading organization overview",
  "overview.loading.body": "Reading workspace data and live HSK grant state…",
  "overview.error.title": "Organization overview is unavailable",
  "overview.error.body":
    "Retry the workspace or check the Supabase configuration.",
  "overview.metric.members": "Members",
  "overview.metric.activeGrants": "Active grants",
  "overview.metric.pendingReviews": "Pending reviews for you",
  "overview.metric.claimableGrants": "Claimable grants for you",
  "overview.metricsUnavailable":
    "Live grant metrics are temporarily unavailable; workspace metadata is still available.",
  "overview.recent.title": "Recent grants",
  "overview.recent.lede":
    "Onchain terms and live state, enriched with workspace context.",
  "overview.recent.viewAll": "View all",
  "overview.recent.empty": "No grants in this workspace yet.",
  "overview.recent.createFirst": "Create the first grant",
  "overview.review.title": "Review queue",
  "overview.review.lede":
    "Only pending milestones for your actual onchain reviewer wallet appear here.",
  "overview.review.loading": "Reading live reviewer assignments…",
  "overview.review.unavailable":
    "Live reviewer assignments are temporarily unavailable.",
  "overview.review.empty": "No associated grants to review.",
  "overview.review.item.loading": "Reading review queue…",
  "overview.review.item.stale":
    "Live review state is unavailable for this grant. Retry from the grant detail page.",
  "overview.review.item.pending.one": "{count} pending milestone",
  "overview.review.item.pending.other": "{count} pending milestones",
  "overview.review.item.reviewer": "{name} is reviewer",
  "overview.review.item.next": "Next:",
  "overview.review.item.action": "Review grant",
  "overview.claim.title": "Claimable for you",
  "overview.claim.lede":
    "Claimable amounts come from each GrantVault, never from Supabase.",
  "overview.claim.loading": "Reading live beneficiary claimability…",
  "overview.claim.unavailable":
    "Live claimable amounts are temporarily unavailable.",
  "overview.claim.empty": "No claimable grants for this wallet.",
  "overview.claim.item.loading": "Reading claimable grant…",
  "overview.claim.item.stale":
    "Live beneficiary state is unavailable for this grant. Retry from the grant detail page.",
  "overview.claim.item.fallbackDescription": "Organization grant",
  "overview.claim.item.amount": "{amount} claimable",
  "overview.claim.item.action": "Open grant",
  "overview.sponsorship.title": "Sponsored first claims",
  "overview.sponsorship.lede":
    "Organization grants can pay the HSK transaction fee for one beneficiary-authorized first claim.",
  "overview.sponsorship.loading": "Reading sponsorship policy…",
  "overview.sponsorship.error":
    "The sponsorship policy is temporarily unavailable.",
  "overview.sponsorship.enabled": "Enable sponsored first claims",
  "overview.sponsorship.enabledHint":
    "The beneficiary still signs the exact vault claim; the organization only pays the relayer fee.",
  "overview.sponsorship.maxClaims": "Organization claim limit",
  "overview.sponsorship.maxClaimsHint":
    "Reserved claims count toward this limit. Maximum: {max}.",
  "overview.sponsorship.usage": "Reserved",
  "overview.sponsorship.remaining": "Remaining",
  "overview.sponsorship.relayer": "Relayer",
  "overview.sponsorship.relayerReady": "Configured",
  "overview.sponsorship.relayerMissing": "Not configured",
  "overview.sponsorship.manualFallback":
    "Beneficiaries can always use the normal wallet-paid claim if sponsorship is unavailable.",
  "overview.sponsorship.save": "Save policy",
  "overview.sponsorship.saving": "Saving policy…",
  "overview.sponsorship.saved": "Sponsorship policy saved.",
  "overview.sponsorship.updateError":
    "The policy could not be saved. Try again without changing the existing reservation limit.",
  "overview.members.title": "Members",
  "overview.members.manage": "Manage",
  "overview.link.summary": "Link an existing GrantVault",
  "overview.link.lede":
    "Use this for a grant that was created before workspace metadata, or to retry a failed metadata sync. The server checks the onchain issuer.",
  "overview.link.address.placeholder": "GrantVault address",
  "overview.link.address.label": "Existing GrantVault address",
  "overview.link.description.placeholder": "Description (optional)",
  "overview.link.action": "Link grant",
  "overview.link.pending": "Checking HSK…",
  "overview.link.success":
    "Grant metadata linked. The workspace list is up to date.",
  "orggrants.loading.title": "Loading workspace grants",
  "orggrants.loading.body": "Reading associated GrantVaults…",
  "orggrants.error.title": "Workspace grants are unavailable",
  "orggrants.error.body": "Retry after checking the workspace connection.",
  "orggrants.title": "Organization grants",
  "orggrants.count.one": "{count} associated GrantVault.",
  "orggrants.count.other": "{count} associated GrantVaults.",
  "orggrants.create": "Create grant",
  "orggrants.empty.title": "No grants have been associated yet.",
  "orggrants.empty.body":
    "Create a grant from this workspace or link an existing GrantVault from the overview.",

  // Member directory, organization creation, and the public grant page.
  "members.loading.title": "Loading members",
  "members.loading.body": "Reading the organization directory…",
  "members.error.title": "Members could not be loaded",
  "members.error.body": "Check the workspace configuration and retry.",
  "members.add.title": "Add a member",
  "members.add.lede":
    "Add a wallet to the organization directory. Role labels are presentation metadata only; GrantVault issuer, beneficiary, and reviewer permissions stay onchain.",
  "members.field.wallet": "Wallet address",
  "members.field.displayName": "Display name",
  "members.field.displayName.placeholder": "Maria Rodriguez",
  "members.field.role": "Role/title",
  "members.field.optional": "(optional)",
  "members.field.role.placeholder": "Treasury Reviewer",
  "members.add.action": "Add member",
  "members.add.pending": "Adding member…",
  "members.directory.title": "Member directory",
  "members.directory.count.one": "{count} wallet in this workspace.",
  "members.directory.count.other": "{count} wallets in this workspace.",
  "members.directory.empty": "No members yet.",
  "members.edit.save": "Save",
  "members.edit.saving": "Saving…",
  "members.edit.cancel": "Cancel",
  "members.owner": "Owner",
  "members.edit": "Edit",
  "members.remove": "Remove",
  "members.removeConfirm": "Remove this member from the organization?",
  "neworg.eyebrow": "New organization",
  "neworg.title": "Create a workspace.",
  "neworg.lede":
    "Set up a calm home for your ecosystem, startup, DAO, foundation, or treasury team.",
  "neworg.profile.title": "Your organization profile",
  "neworg.profile.lede":
    "You will be added automatically as the sole owner. Organization role labels describe people; they do not change GrantVault permissions.",
  "neworg.field.name": "Organization name",
  "neworg.field.name.placeholder": "HashKey LATAM Ecosystem",
  "neworg.field.displayName": "Your display name",
  "neworg.field.displayName.placeholder": "Alejandro Castro",
  "neworg.field.role": "Your role/title",
  "neworg.field.role.placeholder": "Ecosystem Lead",
  "neworg.ownerWallet": "Connected owner wallet:",
  "neworg.action": "Create organization",
  "neworg.pending": "Creating workspace…",
  "neworg.locked.title": "Organization creation is locked",
  "neworg.locked.body":
    "Connect and sign in with the wallet that should own this organization.",
  "grantpage.invalid.title": "Invalid grant address",
  "grantpage.invalid.body": "Open a valid GrantVault address on {network}.",
  "grantpage.back": "Back to my grants",

  // Workspace: dashboard, organization navigation, workspace access and the demo faucet.
  "grants.eyebrow": "Grant operations",
  "grants.title": "Your grants.",
  "grants.lede": "Inspect live grants by the role this wallet holds.",
  "grants.create": "Create grant",
  "dashboard.eyebrow": "Your workspace",
  "dashboard.title": "Grants, with purpose.",
  "dashboard.lede":
    "Manage allocations, track unlocks, and move good work forward.",
  "dashboard.noDeployment.title": "Testnet deployment is not configured",
  "dashboard.noDeployment.body":
    "The application needs the HashVest Testnet deployment before it can load or create real grants.",
  "dashboard.tablist": "Grant role",
  "dashboard.tab.0": "Issued",
  "dashboard.tab.1": "Received",
  "dashboard.tab.2": "Review",
  "dashboard.grants.loading.title": "Loading your grants",
  "dashboard.grants.loading.body": "Reading the factory on {network}…",
  "dashboard.grants.error.title": "Unable to load grants",
  "dashboard.retry": "Retry",
  "dashboard.empty.0.title": "Your first grant starts here.",
  "dashboard.empty.0.body":
    "Create a fully funded allocation with clear conditions for your beneficiary.",
  "dashboard.empty.1.title": "No grants received yet.",
  "dashboard.empty.1.body":
    "Grants assigned to this wallet will appear here automatically.",
  "dashboard.empty.2.title": "No milestones to review yet.",
  "dashboard.empty.2.body":
    "Grants that name this wallet as reviewer will appear here.",
  "settings.eyebrow": "Workspace settings",
  "settings.title": "Organizations.",
  "settings.lede": "Manage the organizations that add context to your grants.",
  "settings.create": "Create organization",
  "settings.loading.title": "Loading organizations",
  "settings.loading.body": "Reading your workspace memberships…",
  "settings.error.title": "Organizations could not be loaded",
  "settings.error.body": "Refresh after checking your workspace connection.",
  "settings.retry": "Retry",
  "settings.list.title": "Your organizations",
  "settings.organization.open": "Open",
  "settings.organization.counts": "{members} members · {grants} grants",
  "settings.empty.title": "Create your first organization",
  "settings.empty.body":
    "Set up a workspace for your team, ecosystem, or treasury. You become the owner automatically.",
  // Analytics dashboard: read-only projections of live HSK grant state.
  "dashboard.connect.eyebrow": "Workspace overview",
  "dashboard.connect.title": "Connect to see your work.",
  "dashboard.connect.body":
    "Your grants, review queue and onchain activity will appear here after connecting a wallet.",
  "dashboard.analytics.loading": "Reading live HSK activity…",
  "dashboard.analytics.error":
    "Live dashboard data is unavailable. Refresh the page and try again.",
  "dashboard.analytics.partial":
    "Some event history could not be read. Current grant states remain live; retry to complete the timeline.",
  "dashboard.metric.active": "Active grants",
  "dashboard.metric.organizations": "Organizations",
  "dashboard.metric.pendingReviews": "Pending reviews",
  "dashboard.metric.claimable": "Claimable grants",
  "dashboard.metric.live": "Live",
  "dashboard.metric.synced": "Synced",
  "dashboard.metric.action": "Action",
  "dashboard.metric.clear": "Clear",
  "dashboard.metric.ready": "Ready",
  "dashboard.metric.none": "None",
  "dashboard.metric.onchain": "onchain",
  "dashboard.metric.context": "context",
  "dashboard.metric.forYou": "for you",
  "dashboard.chart.activity.title": "Grant activity",
  "dashboard.chart.activity.lede":
    "Onchain events across your grants, last six months.",
  "dashboard.chart.activity.aria": "Grant activity over the last six months",
  "dashboard.chart.activity.sr":
    "Each dot represents one onchain dashboard event.",
  "dashboard.chart.series.created": "Created",
  "dashboard.chart.series.approved": "Approved",
  "dashboard.chart.series.claimed": "Claimed",
  "dashboard.chart.series.revoked": "Revoked",
  "dashboard.event.created": "Grant created",
  "dashboard.event.approved": "Milestone approved",
  "dashboard.event.claimed": "Tokens claimed",
  "dashboard.event.revoked": "Grant revoked",
  "dashboard.chart.strategy.title": "Strategies",
  "dashboard.chart.strategy.lede": "Distribution by grant type.",
  "dashboard.chart.strategy.aria": "Grant strategy distribution",
  "dashboard.chart.strategy.grants": "grants",
  "dashboard.chart.top.title": "Top grants",
  "dashboard.chart.top.lede":
    "Your most active onchain allocations this period.",
  "dashboard.chart.top.viewAll": "View all",
  "dashboard.chart.progress.title": "Claim progress",
  "dashboard.chart.progress.lede": "Claimed allocation by grant.",
  "dashboard.chart.progress.empty": "No grant progress yet.",
  "dashboard.chart.recent.title": "Recent activity",
  "dashboard.chart.recent.live": "Live",
  "dashboard.table.caption": "Top grants",
  "dashboard.table.grant": "Grant",
  "dashboard.table.role": "Role",
  "dashboard.table.status": "Status",
  "dashboard.table.claimed": "Claimed",
  "dashboard.table.updated": "Updated",
  "dashboard.table.empty": "No grants found for this wallet.",
  "dashboard.activity.empty": "Onchain activity will appear here.",
  "dashboard.status.revoked": "Revoked",
  "dashboard.status.completed": "Completed",
  "dashboard.status.active": "Active",
  "dashboard.time.now": "now",
  "dashboard.time.minutes": "{count}m ago",
  "dashboard.time.hours": "{count}h ago",
  "dashboard.time.days": "{count}d ago",
  "dashboard.role.issuer": "Issuer",
  "dashboard.role.beneficiary": "Beneficiary",
  "dashboard.role.reviewer": "Reviewer",
  "member.defaultRole": "Member",
  "picker.noMembers": "No members available",
  "picker.chooseBeneficiary": "Choose a beneficiary",
  "picker.chooseReviewer": "Choose a reviewer",
  "picker.useExternal": "Use external wallet",
  "picker.useMembers": "Choose from organization members",
  "workspace.nav.label": "Organization navigation",
  "workspace.tab.overview": "Overview",
  "workspace.tab.grants": "Grants",
  "workspace.tab.members": "Members",
  "workspace.loading.title": "Loading workspace",
  "workspace.loading.body": "Reading organization context…",
  "workspace.error.title": "Workspace could not be loaded",
  "workspace.retry": "Retry",
  "workspace.backToOrganizations": "Organizations",
  "workspace.eyebrow": "HashVest organization",
  "workspace.createGrant": "Create grant",
  "workspace.counts.member": "{count} member",
  "workspace.counts.members": "{count} members",
  "workspace.counts.grant": "{count} grant",
  "workspace.counts.grants": "{count} grants",
  "workspace.members.loading": "Loading members…",
  "workspace.members.error": "Members could not be loaded.",
  "workspace.members.empty": "No members yet.",
  "workspace.members.more": "+{count} more members",
  "access.connect.title": "Connect a wallet to open a workspace",
  "access.connect.body":
    "Workspace access uses a one-time wallet signature. No email account is required.",
  "access.network.title": "Switch to {network} before signing in",
  "access.network.body":
    "HashVest workspace sessions are bound to chain {chainId}.",
  "access.notConfigured.title": "Workspace authentication is not configured",
  "access.notConfigured.body":
    "Set the server-only authentication secret and Supabase service role key, then restart the app.",
  "access.walletChanged.title": "Wallet changed",
  "access.walletChanged.body":
    "Your current wallet differs from the authenticated workspace session. Sign in again before managing organization data.",
  "access.signIn.title": "Sign in to your HashVest workspace",
  "access.signIn.body":
    "One signature enables off-chain organization context. It does not authorize blockchain actions.",
  "faucet.title": "Demo token · {symbol}",
  "faucet.lede": "Test tokens for your first grant. No monetary value.",
  "faucet.balance": "Your balance:",
  "faucet.balanceError": "Token balance is unavailable. Check the Testnet RPC.",
  "faucet.action": "Get demo {symbol}",
  "faucet.minting": "Minting…",

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
  "card.fromTemplate": "From the {template} template",
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
  "detail.fromTemplate":
    "From the {template} template · workspace metadata only",
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
  "detail.sponsor.title": "Organization-paid first claim",
  "detail.sponsor.lede":
    "You authorize this exact vault, amount, and relayer with your wallet signature. The organization pays the HSK fee; it never chooses a different beneficiary or amount.",
  "detail.sponsor.action": "Sponsor my first claim",
  "detail.sponsor.confirmTitle": "Confirm sponsored first claim",
  "detail.sponsor.confirmBody":
    "Your signature authorizes a one-time claim of {amount} from this vault. The organization relayer will pay the HSK transaction fee.",
  "detail.sponsor.confirm": "Sign and submit",
  "detail.sponsor.cancel": "Cancel",
  "detail.sponsor.signing": "Waiting for wallet signature…",
  "detail.sponsor.submitting": "Submitting sponsored claim…",
  "detail.sponsor.retry": "Retry sponsored claim",
  "detail.sponsor.gasPayer": "Gas payer",
  "detail.sponsor.transaction": "Sponsored transaction",
  "detail.sponsor.status.requested": "Sponsorship request recorded",
  "detail.sponsor.status.processing": "Relayer is preparing the transaction…",
  "detail.sponsor.status.submitted": "Sponsored transaction submitted",
  "detail.sponsor.status.confirmed": "Sponsored first claim confirmed",
  "detail.sponsor.status.failed": "Sponsored claim failed",
  "detail.sponsor.statusUnavailable":
    "The sponsored claim status could not be refreshed. The request remains tracked; the normal claim is still available.",
  "detail.sponsor.expired":
    "This signed request has expired. Start a new sponsored claim or use the normal claim.",
  "detail.sponsor.failedFallback":
    "The relayer could not complete this request. Use the normal wallet-paid claim or retry while the request is still valid.",
  "detail.sponsor.manualFallback":
    "The normal wallet-paid claim remains available at all times.",
  "detail.sponsor.error":
    "The sponsored claim could not be completed. Your wallet was not charged by HashVest; use the normal claim or try again.",
  "detail.sponsor.unavailable":
    "Sponsored claims are temporarily unavailable. The normal claim remains available.",
  "detail.sponsor.legacy":
    "This GrantVault uses the legacy manual-claim contract. Use the normal claim below.",
  "detail.sponsor.firstClaimOnly":
    "Sponsorship is limited to the first claim. Use the normal claim for this grant.",
  "detail.sponsor.noClaimable":
    "There is no currently claimable amount to sponsor.",
  "detail.sponsor.checking": "Checking the organization sponsorship policy…",
  "detail.sponsor.policyDisabled":
    "The organization has not enabled sponsored claims. The normal claim remains available.",
  "detail.sponsor.limitReached":
    "The organization sponsorship limit has been reached. The normal claim remains available.",
  "detail.sponsor.relayerMissing":
    "The organization relayer is not configured or funded yet. Use the normal claim.",
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
  "wizard.step.0": "Template",
  "wizard.step.1": "Grant",
  "wizard.step.2": "Strategy",
  "wizard.step.3": "Conditions",
  "wizard.step.4": "Review",
  "wizard.stepTitle.0": "Start from a template",
  "wizard.stepTitle.1": "Who is this grant for?",
  "wizard.stepTitle.2": "Choose how tokens unlock",
  "wizard.stepTitle.3": "Set the conditions",
  "wizard.stepTitle.4": "Review before funding",
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
  "wizard.preset.allocationShare": "{percent}% of the allocation",

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

  // AI Grant Builder (HAS-16/HAS-18). Chrome for the optional draft panel.
  // Adjustment and confirmation keys are resolved from the machine codes in
  // lib/shared/ai-grant-draft/normalize.ts and lib/cloud/ai/draft-service.ts,
  // so the server never ships a user-facing sentence.
  "ai.launcher.label": "Draft a grant from a description",
  "ai.launcher.short": "AI",
  "ai.panel.title": "Describe the grant",
  "ai.panel.lede":
    "Optional. Write what the grant should do and this fills the wizard with an editable draft.",
  "ai.panel.close": "Close the draft panel",
  "ai.field.prompt.label": "What should this grant do?",
  "ai.field.prompt.placeholder":
    "A six-month grant for a developer, 500 tokens, released against three milestones.",
  "ai.field.prompt.counter": "{count} of {max} characters",
  "ai.action.draft": "Draft it",
  "ai.action.drafting": "Drafting",
  "ai.action.apply": "Apply to the wizard",
  "ai.action.discard": "Discard",
  "ai.action.retry": "Try again",

  // Progress steps. These name the real pipeline, not a loading animation.
  "ai.progress.0": "Reading the request",
  "ai.progress.1": "Removing anything private",
  "ai.progress.2": "Choosing an unlock strategy",
  "ai.progress.3": "Splitting the allocation",
  "ai.progress.4": "Checking it against the protocol rules",

  "ai.draft.name": "AI draft",
  "ai.draft.tagline": "A starting point. Every value stays editable.",
  "ai.draft.sourceModel": "Drafted by the configured provider",
  "ai.draft.sourceFallback": "Drafted offline, without a provider",
  "ai.draft.strategy": "Strategy",
  "ai.draft.allocation": "Allocation",
  "ai.draft.schedule": "Schedule",
  "ai.draft.milestones": "Milestones",
  "ai.preset.applied": "From an AI draft",

  "ai.section.assumptions": "Assumptions",
  "ai.section.adjustments": "Changed for you",
  "ai.section.unsupported": "Not supported",
  "ai.section.confirm": "You still choose",
  "ai.confirm.beneficiary": "The beneficiary wallet",
  "ai.confirm.reviewer": "The reviewer wallet",
  "ai.confirm.token": "The token to grant",

  "ai.adjustment.allocationClamped":
    "Reduced the allocation from {requested} to {maximum}: the demo faucet cannot fund more.",
  "ai.adjustment.cliffClamped":
    "Shortened the cliff from {cliff} to {duration}: a cliff cannot outlast its own schedule.",
  "ai.adjustment.durationDefaulted":
    "Set the duration to {duration}, because the draft asked for none.",
  "ai.adjustment.durationClamped":
    "Shortened the duration from {requested} to {maximum}: the draft asked for a schedule longer than ten years.",
  "ai.adjustment.timingDefaulted":
    "Added a default schedule, because this strategy needs one.",
  "ai.adjustment.timingDropped":
    "Removed the schedule: a milestone grant has none.",
  "ai.adjustment.milestonesDefaulted":
    "Added a single milestone covering the whole allocation.",
  "ai.adjustment.milestonesDropped":
    "Removed the milestones: time vesting has none.",
  "ai.adjustment.milestonesTruncated":
    "Kept the first {maximum} milestones, which is all a vault accepts.",
  "ai.adjustment.milestoneTitlesFilled":
    "Named the milestones the draft left blank.",
  "ai.adjustment.percentagesRescaled":
    "Rescaled the milestone split so it adds up to 100%.",
  "ai.adjustment.fieldsDropped":
    "Ignored {count} field(s) a grant template has no place for: {fields}.",
  "ai.adjustment.proseRedacted":
    "Removed something private the draft had written into its own text.",
  "ai.adjustment.offlineDraft":
    "Drafted offline from your words alone. No provider was used.",
  "ai.adjustment.scheduleCompressed":
    "Compressed {requested} into {duration} demo units so the whole cycle is watchable.",
  "ai.adjustment.requestAddressIgnored":
    "Ignored the wallet address in your request. You pick every wallet yourself.",
  "ai.adjustment.requestSecretIgnored":
    "Removed something that looked like a key or a seed phrase. Never paste one here.",
  "ai.adjustment.requestActionIgnored":
    "This drafts a template only. It cannot sign, send, approve, claim, or revoke.",

  "ai.error.unauthenticated": "Sign in to draft a grant.",
  "ai.error.rateLimited": "Too many drafts. Try again in {seconds} seconds.",
  "ai.error.invalidPrompt": "Describe the grant in {min} to {max} characters.",
  "ai.error.failed":
    "The draft could not be produced. The wizard below still works.",
  "ai.disclaimer":
    "A draft only suggests. You confirm every value, and the protocol's own checks still run before anything is signed.",

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
