import type { Address } from "viem";

export const SPONSORED_ACTION_DOMAIN = {
  name: "HashVest Sponsored Actions",
  version: "2",
} as const;

/** @deprecated Use SPONSORED_ACTION_DOMAIN for the v2 generalized surface. */
export const SPONSORED_CLAIM_DOMAIN = SPONSORED_ACTION_DOMAIN;

export const SPONSORED_CLAIM_TYPES = {
  SponsoredClaim: [
    { name: "vault", type: "address" },
    { name: "beneficiary", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "relayer", type: "address" },
  ],
} as const;

export const SPONSORED_REVIEW_TYPES = {
  SponsoredMilestoneApproval: [
    { name: "vault", type: "address" },
    { name: "reviewer", type: "address" },
    { name: "milestoneIndex", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "relayer", type: "address" },
  ],
} as const;

export type SponsoredClaimMessage = {
  vault: Address;
  beneficiary: Address;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
  relayer: Address;
};

export type SponsoredReviewMessage = {
  vault: Address;
  reviewer: Address;
  milestoneIndex: bigint;
  nonce: bigint;
  deadline: bigint;
  relayer: Address;
};
