import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import {
  getSponsoredClaimStatus,
  getSponsoredClaimStatusByNonce,
  submitSponsoredClaim,
} from "@/lib/cloud/sponsored-claims/server";
import {
  parseSponsoredClaimInput,
  parseSponsoredClaimNonce,
  parseSponsoredClaimRequestId,
} from "@/lib/cloud/sponsored-claims/validation";
import {
  InputValidationError,
  normalizeWalletAddress,
  validateUuid,
} from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ organizationId: string; vaultAddress: string }>;
  },
) {
  try {
    assertSameOrigin(request);
    const { organizationId, vaultAddress } = await context.params;
    return Response.json({
      request: await submitSponsoredClaim(
        validateUuid(organizationId),
        normalizeWalletAddress(vaultAddress, "GrantVault address"),
        parseSponsoredClaimInput(await readJson(request)),
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ organizationId: string; vaultAddress: string }>;
  },
) {
  try {
    const { organizationId, vaultAddress } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const requestId = searchParams.get("requestId");
    const nonce = searchParams.get("nonce");
    if (!requestId && !nonce)
      throw new InputValidationError(
        "A sponsored claim request ID or nonce is required.",
      );
    const claimRequest = requestId
      ? await getSponsoredClaimStatus(
          validateUuid(organizationId),
          normalizeWalletAddress(vaultAddress, "GrantVault address"),
          parseSponsoredClaimRequestId(requestId),
        )
      : await getSponsoredClaimStatusByNonce(
          validateUuid(organizationId),
          normalizeWalletAddress(vaultAddress, "GrantVault address"),
          parseSponsoredClaimNonce(nonce),
        );
    return Response.json(
      { request: claimRequest },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
