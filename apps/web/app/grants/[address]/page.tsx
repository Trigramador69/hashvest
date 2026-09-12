import Link from "next/link";
import { GrantDetail } from "@/components/grant-detail";
import { Notice } from "@/components/grant-ui";
import { normalizeAddress } from "@/lib/protocol/grants";

export default async function GrantPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress)
    return (
      <Notice title="Invalid grant address" error>
        <p>Open a valid GrantVault address on HSK Testnet.</p>
        <Link className="text-primary underline" href="/app">
          Back to my grants
        </Link>
      </Notice>
    );
  return <GrantDetail address={normalizedAddress} />;
}
