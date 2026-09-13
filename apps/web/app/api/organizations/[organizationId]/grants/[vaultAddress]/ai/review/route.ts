import { assertSameOrigin } from "@/lib/cloud/api-server";
import { resolveAiProvider } from "@/lib/cloud/ai/config";
import { AiRateLimitError } from "@/lib/cloud/ai/draft-service";
import { aiRateLimiter } from "@/lib/cloud/ai/rate-limit";
import { buildEvidenceReview } from "@/lib/cloud/ai/review-service";
import { aiToolError, readAiBody } from "@/lib/cloud/ai/route-utils";
import { listGrantMilestoneEvidence } from "@/lib/cloud/organizations/evidence-server";
import { requireOrganizationMember } from "@/lib/cloud/organizations/server";
import { normalizeWalletAddress } from "@/lib/cloud/organizations/validation";
import { readGrantReviewSnapshot } from "@/lib/protocol/verify";

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
    const access = await requireOrganizationMember(organizationId);
    const address = normalizeWalletAddress(vaultAddress, "GrantVault");
    const body = await readAiBody(request);
    // This also proves the canonical grant belongs to this organization before RPC/model access.
    const evidence = await listGrantMilestoneEvidence(organizationId, address);
    const decision = aiRateLimiter.consume(
      access.session.walletAddress,
      Date.now(),
    );
    if (!decision.allowed)
      throw new AiRateLimitError(decision.retryAfterSeconds);
    const snapshot = await readGrantReviewSnapshot(address);
    const result = await buildEvidenceReview({
      snapshot,
      evidence,
      address,
      locale: body.locale,
      config: resolveAiProvider(),
      signal: request.signal,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return aiToolError(error);
  }
}
