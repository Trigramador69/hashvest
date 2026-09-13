import Link from "next/link";
import { GrantDetail } from "@/components/grant-detail";
import { Notice } from "@/components/grant-ui";
import { normalizeAddress } from "@/lib/protocol/grants";
import { appRoutes } from "@/lib/shared/routes";
import { getTranslations } from "@/lib/shared/i18n/server";
import { hskTestnet } from "@hashvest/web3";

export default async function GrantPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const { t } = await getTranslations();
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress)
    return (
      <Notice title={t("grantpage.invalid.title")} error>
        <p>{t("grantpage.invalid.body", { network: hskTestnet.name })}</p>
        <Link className="text-primary underline" href={appRoutes.grants}>
          {t("grantpage.back")}
        </Link>
      </Notice>
    );
  return <GrantDetail address={normalizedAddress} />;
}
