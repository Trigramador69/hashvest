import { isAddress } from "viem";

import { HASHVEST_CHAIN_ID } from "./constants";

export type SessionClaims = {
  sub?: unknown;
  chainId?: unknown;
  exp?: unknown;
  iat?: unknown;
};

export function isSessionWalletMatch(
  sessionWallet: string | undefined,
  connectedWallet: string | undefined,
) {
  return Boolean(
    sessionWallet &&
    connectedWallet &&
    sessionWallet.toLowerCase() === connectedWallet.toLowerCase(),
  );
}

export function isValidSessionClaims(claims: SessionClaims) {
  return (
    typeof claims.sub === "string" &&
    isAddress(claims.sub) &&
    typeof claims.chainId === "number" &&
    claims.chainId === HASHVEST_CHAIN_ID
  );
}
