import { randomBytes } from "node:crypto";
import { SiweMessage } from "siwe";
import { getAddress, isAddress } from "viem";

import {
  HASHVEST_CHAIN_ID,
  SIWE_NONCE_MAX_AGE_SECONDS,
  SIWE_STATEMENT,
} from "./constants";

export type ApplicationOrigin = {
  origin: string;
  domain: string;
};

export type SiweChallenge = ApplicationOrigin & {
  nonce: string;
  message: string;
  walletAddress: string;
  issuedAt: string;
  expiresAt: string;
};

export function getApplicationOrigin(request: Request): ApplicationOrigin {
  const configured = process.env.AUTH_APP_URL?.trim();
  let candidate: URL;
  try {
    // Use an explicitly configured public origin behind a proxy. Otherwise use
    // the request URL; forwarded headers are not trusted because clients can
    // spoof them when the proxy does not strip and replace them.
    candidate = new URL(configured || request.url);
  } catch {
    throw new Error("The application origin is invalid.");
  }
  if (
    !/^https?:$/.test(candidate.protocol) ||
    candidate.username ||
    candidate.password
  )
    throw new Error("The application origin is invalid.");
  return { origin: candidate.origin, domain: candidate.host };
}

export function createSiweChallenge(
  walletAddress: string,
  applicationOrigin: ApplicationOrigin,
  now = new Date(),
): SiweChallenge {
  if (!isAddress(walletAddress)) throw new Error("Wallet address is invalid.");
  const normalized = getAddress(walletAddress);
  const nonce = randomBytes(24).toString("hex");
  const issuedAt = now.toISOString();
  const expiresAtDate = new Date(
    now.getTime() + SIWE_NONCE_MAX_AGE_SECONDS * 1000,
  );
  const message = new SiweMessage({
    domain: applicationOrigin.domain,
    address: normalized,
    statement: SIWE_STATEMENT,
    uri: applicationOrigin.origin,
    version: "1",
    chainId: HASHVEST_CHAIN_ID,
    nonce,
    issuedAt,
    expirationTime: expiresAtDate.toISOString(),
  }).prepareMessage();
  return {
    ...applicationOrigin,
    nonce,
    message,
    walletAddress: normalized.toLowerCase(),
    issuedAt,
    expiresAt: expiresAtDate.toISOString(),
  };
}

function sameInstant(left: string, right: string) {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && leftTime === rightTime;
}

export async function verifySiweSignature({
  message,
  signature,
  expected,
  expectedMessage,
  now = new Date(),
}: {
  message: string;
  signature: string;
  expected: SiweChallenge;
  expectedMessage: string;
  now?: Date;
}) {
  if (
    !message ||
    message.length > 5000 ||
    !signature ||
    signature.length > 5000
  )
    throw new Error("The sign-in payload is invalid.");
  if (message !== expectedMessage)
    throw new Error("The sign-in message does not match the issued challenge.");
  let parsed: SiweMessage;
  try {
    parsed = new SiweMessage(message);
  } catch {
    throw new Error("The sign-in message is invalid.");
  }
  if (
    parsed.nonce !== expected.nonce ||
    parsed.domain !== expected.domain ||
    parsed.uri !== expected.origin ||
    parsed.chainId !== HASHVEST_CHAIN_ID ||
    parsed.address.toLowerCase() !== expected.walletAddress
  )
    throw new Error("The sign-in message does not match the issued challenge.");
  if (
    !sameInstant(parsed.issuedAt ?? "", expected.issuedAt) ||
    !sameInstant(parsed.expirationTime ?? "", expected.expiresAt)
  )
    throw new Error("The sign-in message timestamps are invalid.");
  const result = await parsed.verify(
    {
      signature,
      domain: expected.domain,
      nonce: expected.nonce,
      time: now.toISOString(),
    },
    { suppressExceptions: true },
  );
  if (!result.success || !isAddress(parsed.address))
    throw new Error("Signature verification failed.");
  return getAddress(parsed.address).toLowerCase();
}
