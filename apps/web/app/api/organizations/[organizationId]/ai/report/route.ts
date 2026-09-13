import type { Address } from "viem";

import { assertSameOrigin } from "@/lib/cloud/api-server";
import { resolveAiProvider } from "@/lib/cloud/ai/config";
import { AiRateLimitError } from "@/lib/cloud/ai/draft-service";
import { aiRateLimiter } from "@/lib/cloud/ai/rate-limit";
import { buildReportSummary } from "@/lib/cloud/ai/report-service";
import { aiToolError, readAiBody } from "@/lib/cloud/ai/route-utils";
import {
  listGrants,
  requireOrganizationMember,
} from "@/lib/cloud/organizations/server";
import { buildOrganizationReport } from "@/lib/dashboard/organization-report";
import { readOrganizationGrantSnapshots } from "@/lib/protocol/verify";

export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { organizationId } = await context.params;
    const access = await requireOrganizationMember(organizationId);
    const body = await readAiBody(request);
    // Supabase supplies only which vaults to look at; every figure below is HSK's.
    const grants = await listGrants(organizationId);
    const decision = aiRateLimiter.consume(
      access.session.walletAddress,
      Date.now(),
    );
    if (!decision.allowed)
      throw new AiRateLimitError(decision.retryAfterSeconds);
    const reads = await readOrganizationGrantSnapshots(
      grants.map((grant) => grant.vaultAddress as Address),
    );
    const report = buildOrganizationReport({
      wallet: access.session.walletAddress,
      reads,
    });
    const result = await buildReportSummary({
      report,
      omitted: reads.omitted.length,
      locale: body.locale,
      config: resolveAiProvider(),
      signal: request.signal,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return aiToolError(error);
  }
}
