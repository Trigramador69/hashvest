import { apiErrorResponse } from "@/lib/cloud/api-server";
import { listGrantMilestoneEvidence } from "@/lib/cloud/organizations/evidence-server";
import {
  normalizeWalletAddress,
  validateUuid,
} from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ organizationId: string; vaultAddress: string }>;
  },
) {
  try {
    const { organizationId, vaultAddress } = await context.params;
    return Response.json(
      {
        evidence: await listGrantMilestoneEvidence(
          validateUuid(organizationId),
          normalizeWalletAddress(vaultAddress, "GrantVault address"),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
