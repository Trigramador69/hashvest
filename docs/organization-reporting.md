# Organization reporting and lifecycle notifications

HAS-41 (reporting) and HAS-37 (notifications) are two views of the same
question: what is happening to the grants an organization is associated with?
They share one read path and one rule — **HSK is the only source of value and
permission, and neither feature stores a protocol value as authority.**

Supabase contributes exactly one thing to both: the discovery set, which is the
`organization_grants` association saying which vaults belong to the
organization. Everything reported about a vault is read from the vault.

## The shared read

`apps/web/hooks/use-organization-grant-snapshots.ts` reads every associated
vault once, at a single block, into the `OrganizationGrantSnapshot` shape
defined in `apps/web/lib/dashboard/organization-snapshot.ts`. Reading at one
block is what makes a vault's figures agree with each other as time advances.

All three organization surfaces — the overview metrics, the report and the
notifications — use the same query key, so they make one set of RPC reads
between them and refresh together.

A vault whose read fails is not dropped. It is recorded in `unreadable`, and
both features surface it:

| Feature       | A failed read becomes                                             |
| ------------- | ----------------------------------------------------------------- |
| Report        | a partial banner naming the vault, with every figure excluding it |
| Notifications | a `syncUnavailable` item marked **unverified**                    |

Silently excluding it would turn a read failure into a smaller number that
looks confident, which is the failure mode both issues call out.

## Reporting (HAS-41)

`apps/web/lib/dashboard/organization-report.ts` is a pure reducer over the
snapshots. It is rendered by `apps/web/components/organization-report.tsx` at
`/app/organizations/:id/reports`, with the legacy
`/app/settings/organizations/:id/reports` path kept as a redirect.

### What it reports, and from where

| Figure                                  | Source                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| Active / completed / revoked counts     | `totalAllocation`, `claimedAmount`, `revoked` per vault            |
| Grants awaiting your review             | `reviewer` + `getMilestones`, matched against the connected wallet |
| Grants claimable by you                 | `beneficiary` + `claimableAmount`, same match                      |
| Allocated / unlocked / not yet unlocked | `totalAllocation`, `unlockedAmount`                                |
| Claimed / claimable now                 | `claimedAmount`, `claimableAmount`                                 |
| Upcoming cliffs and vesting ends        | `start` plus `cliff` or `duration`                                 |

Every one of these is labelled with its source in the UI, so no number on the
page is unattributed.

### Token scope

Amounts are summed **only inside one ERC20 contract**. There is no price feed
in HashVest, so there is deliberately no cross-token total, no USD conversion,
no TVL, no volume and no yield. Two tokens are two reports.

Each token group also names the vaults behind it. That is what makes the report
reconcilable: open any vault in the group and its GrantDetail figures are the
same reads the group summed.

### Freshness and privacy

The report shows the oldest read behind it, so a stale figure is visible as
stale. Organization-wide totals are the same for every member; the two
role-scoped queues use `resolveProtocolRoles` against the connected wallet
only, so one member never sees another member's review queue or claimable
funds.

## Notifications (HAS-37)

`apps/web/lib/dashboard/organization-notifications.ts` is a pure reducer over
the same snapshots, rendered by
`apps/web/components/organization-notifications.tsx` on the organization
overview.

### Why there is no indexer and no event log

A notification here is **not an event that was observed and recorded**. It is a
fact derived from current vault state, and its identity is derived from the
state fact itself:

| Kind                     | Identity                        | Raised when                                          |
| ------------------------ | ------------------------------- | ---------------------------------------------------- |
| `milestonePendingReview` | `<vault>:milestone-pending:<i>` | you are the reviewer and milestone `i` is unapproved |
| `claimable`              | `<vault>:claimable`             | you are the beneficiary and `claimableAmount > 0`    |
| `cliffReached`           | `<vault>:cliff-reached`         | `start + cliff` has passed                           |
| `vestingComplete`        | `<vault>:vesting-complete`      | `start + duration` has passed                        |
| `completed`              | `<vault>:completed`             | the full allocation is claimed                       |
| `revoked`                | `<vault>:revoked:<revokedAt>`   | the vault reports a revocation                       |
| `syncUnavailable`        | `<vault>:unreadable`            | the vault read did not complete                      |

No identity contains the clock or the moment of the read. Two consequences
follow directly, and they are what the acceptance criteria ask for:

- **Deduplication is a property of the identity.** Reading the same vault again
  reproduces the same keys, so a repeated observation overwrites rather than
  appends. There is no "already seen" table to consult.
- **The stream is bounded by construction.** One vault contributes at most one
  item per pending milestone plus the six single-fact kinds above, so an
  organization cannot accumulate an unbounded backlog. A `NOTIFICATION_LIMIT`
  cap is a second, blunter guard on top of that.

Note in particular that `claimable` carries the amount as detail rather than in
its key. Folding a continuously vesting amount into the identity is exactly how
a linear schedule would produce a new notification on every read.

### Confirmed versus unverified

Every item carries `confidence`. `confirmed` means a vault read succeeded and
the fact came from it. `unverified` is only ever `syncUnavailable`: the Cloud is
reporting that it could not read the vault, and asserting nothing about the
grant itself. That keeps a failed read visibly different from a confirmed
event.

### Privacy and scoping

Scoping is onchain, never organizational. A review item reaches the vault's
`reviewer`; a claimable item reaches its `beneficiary`; schedule items reach the
beneficiary and issuer; completion and revocation reach any party to the grant.
A member with no onchain role on a grant is told nothing about it that every
member cannot already see. A revoked grant stops producing claim and schedule
items entirely, because its schedule stopped at `revokedAt`.

### Read state, retention, and retry

Read/unread is the **only** stored part, because it is the only part not
derivable from the chain. It lives in
`supabase/migrations/20260913030000_hashvest_notification_reads.sql` as
`organization_notification_reads`, keyed by
`(organization_id, member_wallet, notification_key)`.

`apps/web/lib/cloud/organizations/notification-reads-server.ts` enforces:

- reads and writes are scoped to the **session** wallet, never a requested one,
  so a member cannot ask what another member has seen;
- a submitted key must name the vault it belongs to, and that vault must be
  associated with the organization;
- a request may mark at most `NOTIFICATION_READ_BATCH_LIMIT` keys;
- once a member passes `NOTIFICATION_READ_RETENTION` marks for an organization,
  the oldest are dropped.

Deleting every row in that table changes only what a member has seen. It cannot
change a beneficiary, an approval, an allocation or any other HSK authority.

A failed mark is retried by the member, not silently by a background job; a
failed vault read is retried by refetching the shared snapshot query. Nothing
here approves, claims, revokes or signs anything.

### Out of scope

Email, Telegram and Slack adapters are deliberately not built. The issue makes
them conditional on the in-app foundation being reliable, and they would each
need their own delivery, retry and opt-out model.
