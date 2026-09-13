import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import {
  deriveOrganizationNotifications,
  NOTIFICATION_LIMIT,
  type GrantNotification,
} from "./organization-notifications";
import type { OrganizationGrantSnapshot } from "./organization-snapshot";

const NOW = new Date("2026-09-13T00:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

const ISSUER = "0x00000000000000000000000000000000000000c3" as Address;
const BENEFICIARY = "0x00000000000000000000000000000000000000c2" as Address;
const REVIEWER = "0x00000000000000000000000000000000000000c1" as Address;
const BYSTANDER = "0x00000000000000000000000000000000000000ff" as Address;
const VAULT = "0x0000000000000000000000000000000000000001" as Address;

function snapshot(
  overrides: Partial<OrganizationGrantSnapshot> = {},
): OrganizationGrantSnapshot {
  return {
    vaultAddress: VAULT,
    title: "Grant",
    strategy: 0,
    token: "0x00000000000000000000000000000000000000aa" as Address,
    symbol: "AAA",
    decimals: 18,
    totalAllocation: 1000n,
    claimedAmount: 0n,
    claimableAmount: 0n,
    unlockedAmount: 0n,
    initialUnlock: 0n,
    start: BigInt(NOW_SECONDS),
    cliff: 0n,
    duration: 0n,
    issuer: ISSUER,
    beneficiary: BENEFICIARY,
    reviewer: REVIEWER,
    revoked: false,
    revokedAt: 0n,
    milestones: [],
    blockNumber: 1n,
    readAt: NOW.getTime(),
    ...overrides,
  };
}

function derive(
  snapshots: OrganizationGrantSnapshot[],
  options: {
    wallet?: string;
    unreadable?: string[];
    readKeys?: string[];
    now?: Date;
  } = {},
) {
  return deriveOrganizationNotifications({
    wallet: options.wallet,
    reads: {
      snapshots,
      unreadable: (options.unreadable ?? []).map((vaultAddress) => ({
        vaultAddress,
      })),
    },
    readKeys: options.readKeys ? new Set(options.readKeys) : undefined,
    now: options.now ?? NOW,
  });
}

const kinds = (notifications: GrantNotification[]) =>
  notifications.map((item) => item.kind);

describe("deriveOrganizationNotifications", () => {
  describe("deduplication", () => {
    it("produces the same keys when the same state is read again", () => {
      const snapshots = [
        snapshot({
          milestones: [{ title: "M1", amount: 10n, approved: false }],
        }),
      ];
      const first = derive(snapshots, { wallet: REVIEWER });
      // A later read of unchanged state, at a different time.
      const second = deriveOrganizationNotifications({
        wallet: REVIEWER,
        reads: { snapshots, unreadable: [] },
        now: new Date(NOW.getTime() + 60_000),
      });
      expect(first.notifications.map((item) => item.key)).toEqual(
        second.notifications.map((item) => item.key),
      );
    });

    it("keeps one claimable item however much the claimable amount moves", () => {
      const keyFor = (claimableAmount: bigint) =>
        derive([snapshot({ claimableAmount })], {
          wallet: BENEFICIARY,
        }).notifications.map((item) => item.key);
      expect(keyFor(1n)).toEqual([`${VAULT}:claimable`]);
      expect(keyFor(999n)).toEqual([`${VAULT}:claimable`]);
    });

    it("bounds one vault to its pending milestones plus the single facts", () => {
      const result = derive(
        [
          snapshot({
            claimableAmount: 5n,
            cliff: 10n,
            duration: 20n,
            start: BigInt(NOW_SECONDS - 100),
            milestones: [
              { title: "M1", amount: 10n, approved: false },
              { title: "M2", amount: 10n, approved: true },
            ],
          }),
        ],
        { wallet: BENEFICIARY },
      );
      // Beneficiary: claimable, cliff reached, vesting complete. No review
      // items, because this wallet is not the reviewer.
      expect(new Set(result.notifications.map((item) => item.key)).size).toBe(
        result.notifications.length,
      );
      expect(kinds(result.notifications)).toEqual([
        "claimable",
        "cliffReached",
        "vestingComplete",
      ]);
    });

    it("bounds the list for a very large organization", () => {
      const snapshots = Array.from(
        { length: NOTIFICATION_LIMIT + 20 },
        (_, i) =>
          snapshot({
            vaultAddress:
              `0x${(i + 1).toString(16).padStart(40, "0")}` as Address,
            claimableAmount: 1n,
          }),
      );
      expect(
        derive(snapshots, { wallet: BENEFICIARY }).notifications,
      ).toHaveLength(NOTIFICATION_LIMIT);
    });
  });

  describe("member privacy", () => {
    it("sends a pending milestone only to the reviewer", () => {
      const snapshots = [
        snapshot({
          milestones: [{ title: "M1", amount: 10n, approved: false }],
        }),
      ];
      expect(
        kinds(derive(snapshots, { wallet: REVIEWER }).notifications),
      ).toEqual(["milestonePendingReview"]);
      expect(derive(snapshots, { wallet: BENEFICIARY }).notifications).toEqual(
        [],
      );
      expect(derive(snapshots, { wallet: ISSUER }).notifications).toEqual([]);
    });

    it("sends a claimable balance only to the beneficiary", () => {
      const snapshots = [snapshot({ claimableAmount: 5n })];
      expect(
        kinds(derive(snapshots, { wallet: BENEFICIARY }).notifications),
      ).toEqual(["claimable"]);
      expect(derive(snapshots, { wallet: REVIEWER }).notifications).toEqual([]);
    });

    it("tells a member with no onchain role on the grant nothing about it", () => {
      const snapshots = [
        snapshot({
          claimableAmount: 5n,
          revoked: true,
          revokedAt: 100n,
          milestones: [{ title: "M1", amount: 10n, approved: false }],
        }),
      ];
      expect(derive(snapshots, { wallet: BYSTANDER }).notifications).toEqual(
        [],
      );
    });

    it("tells a disconnected wallet nothing", () => {
      expect(derive([snapshot({ claimableAmount: 5n })]).notifications).toEqual(
        [],
      );
    });
  });

  describe("lifecycle facts", () => {
    it("announces a revocation once, keyed by the onchain timestamp", () => {
      const result = derive(
        [snapshot({ revoked: true, revokedAt: 1757_000_000n })],
        { wallet: ISSUER },
      );
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]).toMatchObject({
        kind: "revoked",
        key: `${VAULT}:revoked:1757000000`,
        detail: { at: 1757000000 },
      });
    });

    it("stops claim and schedule notifications once a grant is revoked", () => {
      const result = derive(
        [
          snapshot({
            revoked: true,
            revokedAt: 100n,
            claimableAmount: 5n,
            start: BigInt(NOW_SECONDS - 100),
            cliff: 10n,
            duration: 20n,
          }),
        ],
        { wallet: BENEFICIARY },
      );
      expect(kinds(result.notifications)).toEqual(["revoked"]);
    });

    it("announces completion to every party", () => {
      const snapshots = [
        snapshot({ totalAllocation: 100n, claimedAmount: 100n }),
      ];
      for (const wallet of [ISSUER, BENEFICIARY, REVIEWER])
        expect(kinds(derive(snapshots, { wallet }).notifications)).toContain(
          "completed",
        );
    });

    it("raises a cliff only after its date has passed", () => {
      const future = snapshot({
        start: BigInt(NOW_SECONDS),
        cliff: 500n,
        duration: 0n,
      });
      expect(derive([future], { wallet: BENEFICIARY }).notifications).toEqual(
        [],
      );
      const reached = snapshot({
        start: BigInt(NOW_SECONDS - 600),
        cliff: 500n,
        duration: 0n,
      });
      expect(
        kinds(derive([reached], { wallet: BENEFICIARY }).notifications),
      ).toEqual(["cliffReached"]);
    });

    it("raises no schedule notification for a milestone-only grant", () => {
      const result = derive(
        [
          snapshot({
            strategy: 1,
            start: BigInt(NOW_SECONDS - 600),
            cliff: 500n,
            duration: 500n,
          }),
        ],
        { wallet: BENEFICIARY },
      );
      expect(result.notifications).toEqual([]);
    });
  });

  describe("failed reads", () => {
    it("marks an unreadable vault unverified rather than claiming a lifecycle", () => {
      const result = derive([], {
        wallet: BENEFICIARY,
        unreadable: ["0x09"],
      });
      expect(result.partial).toBe(true);
      expect(result.notifications).toEqual([
        {
          key: "0x09:unreadable",
          kind: "syncUnavailable",
          chainId: 133,
          vaultAddress: "0x09",
          title: "0x09",
          confidence: "unverified",
          href: "/grants/0x09",
          detail: {},
          read: false,
        },
      ]);
    });

    it("marks everything read from the chain as confirmed", () => {
      const result = derive([snapshot({ claimableAmount: 5n })], {
        wallet: BENEFICIARY,
      });
      expect(result.notifications[0].confidence).toBe("confirmed");
      expect(result.partial).toBe(false);
    });

    it("shows an unreadable vault to a member with no role on it", () => {
      const result = derive([], { wallet: BYSTANDER, unreadable: ["0x09"] });
      expect(kinds(result.notifications)).toEqual(["syncUnavailable"]);
    });
  });

  describe("presentation", () => {
    it("links every notification to the grant it is about", () => {
      const result = derive([snapshot({ claimableAmount: 5n })], {
        wallet: BENEFICIARY,
      });
      expect(result.notifications[0].href).toBe(`/grants/${VAULT}`);
    });

    it("carries the detail needed to explain why it was raised", () => {
      const result = derive(
        [
          snapshot({
            milestones: [
              { title: "Ship the audit", amount: 250n, approved: false },
            ],
          }),
        ],
        { wallet: REVIEWER },
      );
      expect(result.notifications[0].detail).toEqual({
        milestoneIndex: 0,
        milestoneTitle: "Ship the audit",
        amount: 250n,
        symbol: "AAA",
        decimals: 18,
      });
    });

    it("puts what a member can act on before what merely happened", () => {
      const result = derive(
        [
          snapshot({
            vaultAddress: "0x01" as Address,
            claimableAmount: 5n,
            start: BigInt(NOW_SECONDS - 600),
            cliff: 100n,
            duration: 200n,
          }),
        ],
        { wallet: BENEFICIARY, unreadable: ["0x09"] },
      );
      expect(kinds(result.notifications)).toEqual([
        "claimable",
        "syncUnavailable",
        "cliffReached",
        "vestingComplete",
      ]);
    });

    it("counts only unread items", () => {
      const snapshots = [
        snapshot({
          milestones: [
            { title: "M1", amount: 10n, approved: false },
            { title: "M2", amount: 10n, approved: false },
          ],
        }),
      ];
      const result = derive(snapshots, {
        wallet: REVIEWER,
        readKeys: [`${VAULT}:milestone-pending:0`],
      });
      expect(result.notifications.map((item) => item.read)).toEqual([
        true,
        false,
      ]);
      expect(result.unreadCount).toBe(1);
    });

    it("keeps a stored read mark attached to the same state fact", () => {
      // Approving milestone 0 retires its key; milestone 1 keeps its own
      // identity and its own read state.
      const result = derive(
        [
          snapshot({
            milestones: [
              { title: "M1", amount: 10n, approved: true },
              { title: "M2", amount: 10n, approved: false },
            ],
          }),
        ],
        {
          wallet: REVIEWER,
          readKeys: [`${VAULT}:milestone-pending:0`],
        },
      );
      expect(result.notifications.map((item) => item.key)).toEqual([
        `${VAULT}:milestone-pending:1`,
      ]);
      expect(result.unreadCount).toBe(1);
    });
  });
});
