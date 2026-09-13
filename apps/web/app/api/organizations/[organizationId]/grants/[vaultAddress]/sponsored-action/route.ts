import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import {
  getSponsoredActionStatus,
  getSponsoredActionStatusByNonce,
  submitSponsoredAction,
} from "@/lib/cloud/sponsored-claims/server";
import {
  parseSponsoredActionInput,
  parseSponsoredActionNonce,
  parseSponsoredActionRequestId,
} from "@/lib/cloud/sponsored-claims/validation";
import {
  InputValidationError,
  normalizeWalletAddress,
  validateUuid,
} from "@/lib/cloud/organizations/validation";
import type { SponsoredActionType } from "@/lib/cloud/organizations/types";

export const runtime = "nodejs";

function parseActionType(value: string | null): SponsoredActionType {
  if (value === "claim" || value === "review") return value;
  throw new InputValidationError("Action type must be claim or review.");
}

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
      request: await submitSponsoredAction(
        validateUuid(organizationId),
        normalizeWalletAddress(vaultAddress, "GrantVault address"),
        parseSponsoredActionInput(await readJson(request)),
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
        "A sponsored action request ID or nonce is required.",
      );
    const actionRequest = requestId
      ? await getSponsoredActionStatus(
          validateUuid(organizationId),
          normalizeWalletAddress(vaultAddress, "GrantVault address"),
          parseSponsoredActionRequestId(requestId),
        )
      : await getSponsoredActionStatusByNonce(
          validateUuid(organizationId),
          normalizeWalletAddress(vaultAddress, "GrantVault address"),
          parseActionType(searchParams.get("actionType")),
          parseSponsoredActionNonce(nonce),
        );
    return Response.json(
      { request: actionRequest },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
