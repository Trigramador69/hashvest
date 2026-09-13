import { deriveGrantLifecycle } from "../protocol/grant-state";
import { resolveProtocolRoles } from "../protocol/roles";
import {
  cliffAt,
  vestingEndsAt,
  type OrganizationGrantReads,
  type OrganizationGrantSnapshot,
} from "./organization-snapshot";

/**
 * Lifecycle notifications for an organization member, without an indexer.
 *
 * There is no event stream and no stored observation history here. Each
 * notification is derived from the current GrantVault state, and its identity
 * is derived from the state fact itself — a milestone index, a schedule date
 * that has passed, a revocation timestamp — never from the clock or from when
 * the read happened. Reading the same vault again therefore reproduces exactly
 * the same keys, so repeated polling cannot grow the stream: deduplication is
 * a property of the identity, not a table of things already seen.
 *
 * That also bounds the stream by construction. One vault can contribute at
 * most one notification per pending milestone plus the five single-fact ones
 * below, so an organization can never accumulate an unbounded backlog.
 *
 * Read/unread is the only thing that is stored (per member, per key), because
 * it is the only part that is not derivable from the chain.
 */
export type GrantNotificationKind =
  /** A milestone is waiting for this reviewer. */
  | "milestonePendingReview"
  /** A cliff date has passed and now releases the vesting allocation. */
  | "cliffReached"
  /** Time vesting has finished for this grant. */
  | "vestingComplete"
  /** Unlocked tokens are waiting for this beneficiary to claim. */
  | "claimable"
  /** The full allocation has been claimed. */
  | "completed"
  /** The issuer revoked the grant. */
  | "revoked"
  /**
   * The vault could not be read, so the Cloud cannot confirm its state. This
   * is the one kind that reports an absence of knowledge rather than a fact.
   */
  | "syncUnavailable";

/** Ordering: what a member can act on comes before what merely happened. */
const KIND_PRIORITY: GrantNotificationKind[] = [
  "milestonePendingReview",
  "claimable",
  "syncUnavailable",
  "revoked",
  "completed",
  "cliffReached",
  "vestingComplete",
];

/**
 * How many notifications one member sees for one organization. The derivation
 * is already bounded; this is a second, blunter guard so a very large
 * organization still renders a finite list.
 */
export const NOTIFICATION_LIMIT = 50;

export type GrantNotificationDetail = {
  milestoneIndex?: number;
  milestoneTitle?: string;
  amount?: bigint;
  symbol?: string;
  decimals?: number;
  at?: number;
};

export type GrantNotification = {
  /**
   * Stable identity for this observation. Derived from the vault and the state
   * fact, so the same state always produces the same key and a duplicate read
   * overwrites rather than appends.
   */
  key: string;
  kind: GrantNotificationKind;
  chainId: 133;
  vaultAddress: string;
  /** The vault title, or the address when the vault could not be read. */
  title: string;
  /**
   * Whether the chain confirmed this. `confirmed` came from a successful vault
   * read; `unverified` means the read failed and nothing is being asserted
   * about the grant itself.
   */
  confidence: "confirmed" | "unverified";
  /** Where the member goes to act on or verify this. */
  href: string;
  detail: GrantNotificationDetail;
  read: boolean;
};

export type OrganizationNotifications = {
  notifications: GrantNotification[];
  unreadCount: number;
  /** True when at least one associated vault could not be read. */
  partial: boolean;
};

function grantHref(vaultAddress: string) {
  return `/grants/${vaultAddress}`;
}

function notificationsForSnapshot(
  snapshot: OrganizationGrantSnapshot,
  wallet: string | undefined,
  nowSeconds: number,
): Array<Omit<GrantNotification, "read">> {
  const roles = resolveProtocolRoles(wallet, snapshot);
  const isParty = roles.isIssuer || roles.isBeneficiary || roles.isReviewer;
  const vaultAddress = snapshot.vaultAddress;
  const base = {
    chainId: 133 as const,
    vaultAddress,
    title: snapshot.title,
    confidence: "confirmed" as const,
    href: grantHref(vaultAddress),
  };
  const items: Array<Omit<GrantNotification, "read">> = [];
  const lifecycle = deriveGrantLifecycle({
    totalAllocation: snapshot.totalAllocation,
    claimedAmount: snapshot.claimedAmount,
    revoked: snapshot.revoked,
  });

  if (lifecycle === "REVOKED") {
    // Only a party to the grant is told it was revoked, and the identity uses
    // the onchain revocation timestamp so it is announced exactly once.
    if (isParty)
      items.push({
        ...base,
        key: `${vaultAddress}:revoked:${snapshot.revokedAt}`,
        kind: "revoked",
        detail: { at: Number(snapshot.revokedAt) },
      });
    // A revoked grant has no further schedule and nothing left to claim.
    return items;
  }

  if (roles.isReviewer)
    for (const [index, milestone] of snapshot.milestones.entries()) {
      if (milestone.approved) continue;
      items.push({
        ...base,
        key: `${vaultAddress}:milestone-pending:${index}`,
        kind: "milestonePendingReview",
        detail: {
          milestoneIndex: index,
          milestoneTitle: milestone.title,
          amount: milestone.amount,
          symbol: snapshot.symbol,
          decimals: snapshot.decimals,
        },
      });
    }

  if (roles.isBeneficiary && snapshot.claimableAmount > 0n)
    items.push({
      ...base,
      // One standing item while funds are claimable, not one per read: the
      // amount is carried as detail rather than folded into the identity.
      key: `${vaultAddress}:claimable`,
      kind: "claimable",
      detail: {
        amount: snapshot.claimableAmount,
        symbol: snapshot.symbol,
        decimals: snapshot.decimals,
      },
    });

  if (roles.isBeneficiary || roles.isIssuer) {
    const cliff = cliffAt(snapshot);
    if (cliff !== null && cliff <= nowSeconds)
      items.push({
        ...base,
        key: `${vaultAddress}:cliff-reached`,
        kind: "cliffReached",
        detail: { at: cliff },
      });
    const end = vestingEndsAt(snapshot);
    if (end !== null && end <= nowSeconds)
      items.push({
        ...base,
        key: `${vaultAddress}:vesting-complete`,
        kind: "vestingComplete",
        detail: { at: end },
      });
  }

  if (lifecycle === "COMPLETED" && isParty)
    items.push({
      ...base,
      key: `${vaultAddress}:completed`,
      kind: "completed",
      detail: {
        amount: snapshot.claimedAmount,
        symbol: snapshot.symbol,
        decimals: snapshot.decimals,
      },
    });

  return items;
}

/**
 * Derive a member's notifications from the organization's live vault reads.
 *
 * Role scoping is onchain only: a review item reaches the vault's reviewer, a
 * claimable item reaches its beneficiary, and a member with no role on a grant
 * is told nothing about it beyond what every member can already see.
 */
export function deriveOrganizationNotifications({
  wallet,
  reads,
  readKeys,
  now = new Date(),
}: {
  wallet?: string;
  reads: OrganizationGrantReads;
  readKeys?: ReadonlySet<string>;
  now?: Date;
}): OrganizationNotifications {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const derived = new Map<string, Omit<GrantNotification, "read">>();

  for (const snapshot of reads.snapshots)
    for (const item of notificationsForSnapshot(snapshot, wallet, nowSeconds))
      derived.set(item.key, item);

  // An unreadable vault is reported as an unverified item, never as a
  // lifecycle claim: the member can see something is wrong without being told
  // anything about the grant that was not actually read.
  for (const failure of reads.unreadable)
    derived.set(`${failure.vaultAddress}:unreadable`, {
      key: `${failure.vaultAddress}:unreadable`,
      kind: "syncUnavailable",
      chainId: 133,
      vaultAddress: failure.vaultAddress,
      title: failure.vaultAddress,
      confidence: "unverified",
      href: grantHref(failure.vaultAddress),
      detail: {},
    });

  const notifications = [...derived.values()]
    .map((item) => ({ ...item, read: readKeys?.has(item.key) ?? false }))
    .sort((left, right) => {
      const byKind =
        KIND_PRIORITY.indexOf(left.kind) - KIND_PRIORITY.indexOf(right.kind);
      if (byKind !== 0) return byKind;
      return left.key.localeCompare(right.key);
    })
    .slice(0, NOTIFICATION_LIMIT);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    partial: reads.unreadable.length > 0,
  };
}
