import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/cloud/api-server";
import { upsertGrantMilestoneEvidence } from "@/lib/cloud/organizations/evidence-server";
import {
  normalizeWalletAddress,
  parseMilestoneEvidenceInput,
  parseMilestoneIndex,
  validateUuid,
} from "@/lib/cloud/organizations/validation";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      organizationId: string;
      vaultAddress: string;
      milestoneIndex: string;
    }>;
  },
) {
  try {
    assertSameOrigin(request);
    const { organizationId, vaultAddress, milestoneIndex } =
      await context.params;
    return Response.json({
      evidence: await upsertGrantMilestoneEvidence(
        validateUuid(organizationId),
        normalizeWalletAddress(vaultAddress, "GrantVault address"),
        parseMilestoneIndex(milestoneIndex),
        parseMilestoneEvidenceInput(await readJson(request)),
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
