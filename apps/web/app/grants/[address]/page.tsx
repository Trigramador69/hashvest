import Link from "next/link";
import { getAddress, isAddress } from "viem";
import { GrantDetail } from "@/components/grant-detail";
import { Notice } from "@/components/grant-ui";

export default async function GrantPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  if (!isAddress(address))
    return (
      <Notice title="Invalid grant address" error>
        <p>Open a valid GrantVault address on HSK Testnet.</p>
        <Link className="text-primary underline" href="/app">
          Back to my grants
        </Link>
      </Notice>
    );
  return <GrantDetail address={getAddress(address)} />;
}
