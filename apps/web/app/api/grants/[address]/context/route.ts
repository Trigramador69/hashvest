import { apiErrorResponse } from "@/lib/api-server";
import { getGrantContext } from "@/lib/organizations/server";
import { normalizeWalletAddress } from "@/lib/organizations/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await context.params;
    const vaultAddress = normalizeWalletAddress(address, "GrantVault address");
    let grantContext = null;
    try {
      grantContext = await getGrantContext(vaultAddress);
    } catch {
      // A public onchain grant must remain readable when optional workspace
      // metadata is unavailable.
      grantContext = null;
    }
    return Response.json(
      { context: grantContext },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
