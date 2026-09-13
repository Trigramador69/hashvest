import type { Address } from "viem";

export const SPONSORED_CLAIM_DOMAIN = {
  name: "HashVest Sponsored Claim",
  version: "1",
} as const;

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

export type SponsoredClaimMessage = {
  vault: Address;
  beneficiary: Address;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
  relayer: Address;
};
