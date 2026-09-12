import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { getAddress, isAddress } from "viem";

import {
  HASHVEST_CHAIN_ID,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "./constants";
import { isValidSessionClaims, type SessionClaims } from "./session-utils";
import type { Session } from "../organizations/types";

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

function getSecretKey() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32)
    throw new AuthConfigurationError(
      "Workspace authentication is not configured. Set AUTH_SECRET to a random value of at least 32 characters.",
    );
  return new TextEncoder().encode(secret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

export async function createSessionToken(walletAddress: string) {
  const normalized = getAddress(walletAddress).toLowerCase();
  return new SignJWT({ chainId: HASHVEST_CHAIN_ID })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(normalized)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function setSessionCookie(walletAddress: string) {
  const cookieStore = await cookies();
  const token = await createSessionToken(walletAddress);
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions());
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
}

export async function readSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionClaims>(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (
      !isValidSessionClaims(payload) ||
      typeof payload.sub !== "string" ||
      !isAddress(payload.sub)
    )
      return null;
    const subject = payload.sub;
    const expiresAt =
      typeof payload.exp === "number"
        ? new Date(payload.exp * 1000).toISOString()
        : null;
    if (!expiresAt) return null;
    return {
      walletAddress: getAddress(subject).toLowerCase(),
      chainId: HASHVEST_CHAIN_ID,
      expiresAt,
    };
  } catch {
    return null;
  }
}
