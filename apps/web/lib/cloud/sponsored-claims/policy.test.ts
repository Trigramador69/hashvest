import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";

import { ApiError } from "@/lib/shared/api-error";
import { SPONSORED_ACTION_LEASE_TIMEOUT_SECONDS } from "@/lib/shared/sponsored-claims";

import {
  assertLiveAction,
  canAutoRecoverSponsoredRequest,
  classifyRelayerFailure,
  isFreshProcessingLease,
  isTerminalSponsoredRequest,
  policyErrorFromReserve,
  sameSignedBinding,
} from "./policy";
import type { SponsoredActionInput } from "./validation";

const relayer = "0x0000000000000000000000000000000000000001" as Address;
const beneficiary = "0x00000000000000000000000000000000000000b1" as Address;
const reviewer = "0x00000000000000000000000000000000000000c1" as Address;
const signature = `0x${"ab".repeat(65)}` as Hex;

const claimInput: SponsoredActionInput = {
  actionType: "claim",
  amount: 100n,
  milestoneIndex: null,
  nonce: 0n,
  deadline: 1_200n,
  relayerAddress: relayer,
  signature,
};

const reviewInput: SponsoredActionInput = {
  actionType: "review",
  amount: null,
  milestoneIndex: 1,
  nonce: 2n,
  deadline: 1_200n,
  relayerAddress: relayer,
  signature,
};

const liveSnapshot = {
  beneficiary,
  reviewer,
  claimableAmount: 100n,
  claimNonce: 0n,
  reviewNonce: 2n,
  revoked: false,
  milestones: [
    { title: "Prototype", amount: 40n, approved: true },
    { title: "Launch", amount: 60n, approved: false },
  ],
};

describe("sponsored action policy", () => {
  it("requires an identical signed binding to reuse a nonce", () => {
    const row = {
      action_type: "claim" as const,
      actor_wallet: beneficiary.toLowerCase(),
      claim_amount: "100",
      milestone_index: null,
      nonce: "0",
      deadline: "1200",
      relayer_address: relayer.toLowerCase(),
      signature,
    };
    expect(sameSignedBinding(row, claimInput, beneficiary)).toBe(true);
    expect(
      sameSignedBinding(
        { ...row, claim_amount: "99" },
        claimInput,
        beneficiary,
      ),
    ).toBe(false);
    expect(
      sameSignedBinding(row, { ...claimInput, nonce: 1n }, beneficiary),
    ).toBe(false);
  });

  it("classifies relayer failures without leaking a retry for submitted hashes", () => {
    expect(
      classifyRelayerFailure(new Error("insufficient funds for gas")),
    ).toMatchObject({ code: "relayer_insufficient_funds" });
    expect(
      classifyRelayerFailure(new Error("request timed out")),
    ).toMatchObject({ code: "relayer_unavailable" });
    expect(
      classifyRelayerFailure(new Error("execution reverted")),
    ).toMatchObject({ code: "sponsored_action_rejected" });
  });

  it("recovers only requested or stale processing leases, never a hashed failure", () => {
    expect(
      isTerminalSponsoredRequest({ status: "failed", tx_hash: "0xabc" }),
    ).toBe(true);
    expect(
      isTerminalSponsoredRequest({ status: "failed", tx_hash: null }),
    ).toBe(false);
    const fresh = new Date().toISOString();
    expect(
      isFreshProcessingLease({
        status: "processing",
        tx_hash: null,
        processing_at: fresh,
      }),
    ).toBe(true);
    expect(
      isFreshProcessingLease({
        status: "processing",
        tx_hash: null,
        processing_at: new Date(
          Date.now() - (SPONSORED_ACTION_LEASE_TIMEOUT_SECONDS + 1) * 1000,
        ).toISOString(),
      }),
    ).toBe(false);
    expect(
      canAutoRecoverSponsoredRequest(
        { status: "requested", tx_hash: null, processing_at: null },
        { retryFailed: false },
      ),
    ).toBe(true);
    expect(
      canAutoRecoverSponsoredRequest(
        { status: "failed", tx_hash: null, processing_at: null },
        { retryFailed: false },
      ),
    ).toBe(false);
    expect(
      canAutoRecoverSponsoredRequest(
        { status: "failed", tx_hash: null, processing_at: null },
        { retryFailed: true },
      ),
    ).toBe(true);
    expect(
      canAutoRecoverSponsoredRequest(
        { status: "processing", tx_hash: null, processing_at: fresh },
        { retryFailed: false },
      ),
    ).toBe(false);
    expect(
      canAutoRecoverSponsoredRequest(
        {
          status: "processing",
          tx_hash: null,
          processing_at: new Date(
            Date.now() - (SPONSORED_ACTION_LEASE_TIMEOUT_SECONDS + 1) * 1000,
          ).toISOString(),
        },
        { retryFailed: false },
      ),
    ).toBe(true);
  });

  it("keeps HSK roles, nonces, and live claimable state authoritative", () => {
    expect(assertLiveAction(claimInput, liveSnapshot, beneficiary)).toBe(
      beneficiary,
    );
    expect(assertLiveAction(reviewInput, liveSnapshot, reviewer)).toBe(
      reviewer,
    );
    expect(() =>
      assertLiveAction(claimInput, liveSnapshot, reviewer),
    ).toThrowError(ApiError);
    expect(() =>
      assertLiveAction(
        {
          ...claimInput,
          actionType: "claim",
          amount: 101n,
          milestoneIndex: null,
        },
        liveSnapshot,
        beneficiary,
      ),
    ).toThrow(/no longer claimable/);
    expect(() =>
      assertLiveAction(
        {
          ...reviewInput,
          actionType: "review",
          amount: null,
          milestoneIndex: 0,
        },
        liveSnapshot,
        reviewer,
      ),
    ).toThrow(/already approved/);
    expect(() =>
      assertLiveAction(
        reviewInput,
        { ...liveSnapshot, revoked: true },
        reviewer,
      ),
    ).toThrow(/revoked grant/);
  });

  it("maps reserve policy codes to explicit HTTP failures", () => {
    expect(policyErrorFromReserve("VAULT_NOT_ALLOWED")).toEqual([
      "VAULT_NOT_ALLOWED",
      403,
      "This vault is not allowed by policy.",
    ]);
    expect(policyErrorFromReserve("DAILY_RATE_LIMIT_REACHED")?.[1]).toBe(429);
    expect(policyErrorFromReserve("ACTION_BINDING_MISMATCH")?.[0]).toBe(
      "ACTION_BINDING_MISMATCH",
    );
    expect(policyErrorFromReserve("unknown")).toBeUndefined();
  });
});
