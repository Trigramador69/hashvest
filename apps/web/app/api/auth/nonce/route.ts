import {
  ApiError,
  assertSameOrigin,
  apiErrorResponse,
  readJson,
} from "@/lib/api-server";
import { createSiweChallenge, getApplicationOrigin } from "@/lib/auth/siwe";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { normalizeWalletAddress } from "@/lib/organizations/validation";
import { HASHVEST_CHAIN_ID } from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!body || typeof body !== "object")
      throw new ApiError(400, "Invalid request.");
    const input = body as Record<string, unknown>;
    if (input.chainId !== undefined && input.chainId !== HASHVEST_CHAIN_ID)
      throw new ApiError(
        400,
        "Sign in with a wallet on HSK Testnet (chain 133).",
      );
    const walletAddress = normalizeWalletAddress(
      input.address,
      "Connected wallet",
    );
    const challenge = createSiweChallenge(
      walletAddress,
      getApplicationOrigin(request),
    );
    const { error } = await createSupabaseAdmin().from("auth_nonces").insert({
      nonce: challenge.nonce,
      wallet_address: challenge.walletAddress,
      domain: challenge.domain,
      uri: challenge.origin,
      chain_id: HASHVEST_CHAIN_ID,
      message: challenge.message,
      issued_at: challenge.issuedAt,
      expires_at: challenge.expiresAt,
    });
    if (error) throw new Error("Could not store the sign-in challenge.");
    return Response.json({
      message: challenge.message,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
