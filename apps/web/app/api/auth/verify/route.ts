import { SiweMessage } from "siwe";

import {
  assertSameOrigin,
  apiErrorResponse,
  readJson,
  ApiError,
} from "@/lib/cloud/api-server";
import { HASHVEST_CHAIN_ID } from "@/lib/cloud/auth/constants";
import {
  getApplicationOrigin,
  verifySiweSignature,
} from "@/lib/cloud/auth/siwe";
import { setSessionCookie } from "@/lib/cloud/auth/session";
import { createSupabaseAdmin } from "@/lib/cloud/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!body || typeof body !== "object")
      throw new ApiError(400, "Sign-in data is invalid.");
    const input = body as Record<string, unknown>;
    if (
      typeof input.message !== "string" ||
      typeof input.signature !== "string"
    )
      throw new ApiError(400, "Sign-in data is invalid.");
    let parsed: SiweMessage;
    try {
      parsed = new SiweMessage(input.message);
    } catch {
      throw new ApiError(401, "The sign-in message is invalid or expired.");
    }
    const supabase = createSupabaseAdmin();
    const { data: nonce, error: nonceError } = await supabase
      .from("auth_nonces")
      .select(
        "nonce,wallet_address,domain,uri,chain_id,message,issued_at,expires_at,used_at",
      )
      .eq("nonce", parsed.nonce)
      .maybeSingle();
    if (nonceError) throw new Error("Could not read the sign-in challenge.");
    const now = new Date();
    if (
      !nonce ||
      nonce.used_at ||
      nonce.chain_id !== HASHVEST_CHAIN_ID ||
      new Date(nonce.expires_at).getTime() <= now.getTime()
    )
      throw new ApiError(401, "The sign-in message is invalid or expired.");
    const applicationOrigin = getApplicationOrigin(request);
    if (
      nonce.domain !== applicationOrigin.domain ||
      nonce.uri !== applicationOrigin.origin
    )
      throw new ApiError(
        401,
        "The sign-in message was issued for another application origin.",
      );
    const walletAddress = await verifySiweSignature({
      message: input.message,
      signature: input.signature,
      expected: {
        nonce: nonce.nonce,
        walletAddress: nonce.wallet_address,
        domain: nonce.domain,
        origin: nonce.uri,
        message: nonce.message,
        issuedAt: nonce.issued_at,
        expiresAt: nonce.expires_at,
      },
      expectedMessage: nonce.message,
      now,
    });
    const { data: consumed, error: consumeError } = await supabase
      .from("auth_nonces")
      .update({ used_at: now.toISOString() })
      .eq("nonce", nonce.nonce)
      .is("used_at", null)
      .gt("expires_at", now.toISOString())
      .select("nonce")
      .maybeSingle();
    if (consumeError)
      throw new Error("Could not complete the sign-in challenge.");
    if (!consumed)
      throw new ApiError(401, "The sign-in message has already been used.");
    await setSessionCookie(walletAddress);
    return Response.json({
      authenticated: true,
      walletAddress,
      chainId: HASHVEST_CHAIN_ID,
    });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      if (/sign-in message|signature/i.test(error.message))
        return Response.json(
          { error: "Signature verification failed." },
          { status: 401 },
        );
    }
    return apiErrorResponse(error);
  }
}
