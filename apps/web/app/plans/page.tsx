import type { Metadata } from "next";

import { ProductModelPresentation } from "@/components/product-model";
import { getTranslations } from "@/lib/shared/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("plans.meta.title"),
    description: t("plans.meta.description"),
  };
}

export default async function PlansPage() {
  const { t } = await getTranslations();
  return <ProductModelPresentation t={t} variant="detail" />;
}
