import Link from "next/link";

import { hskTestnet } from "@hashvest/web3";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataArt } from "@/components/ui/data-art";
import { ProductModelPresentation } from "@/components/product-model";
import { getTranslations } from "@/lib/shared/i18n/server";
import { appRoutes } from "@/lib/shared/routes";

/** Step and strategy cards are key triples; the copy lives in the dictionary. */
const STEPS = ["fund", "unlock", "claim"] as const;
const STRATEGIES = ["time", "milestone", "hybrid"] as const;

export default async function Home() {
  const { t } = await getTranslations();
  return (
    <div className="space-y-16 py-2 sm:py-8">
      <section className="relative grid min-h-[430px] items-center overflow-hidden lg:grid-cols-12">
        <div className="relative z-10 lg:col-span-7">
          <p className="mb-5 font-mono text-[10px] font-medium uppercase tracking-[.08em] text-primary">
            {t("home.eyebrow")}
          </p>
          <h1 className="max-w-3xl font-mono text-[clamp(42px,6vw,76px)] font-normal leading-[.98] tracking-[-.06em]">
            {t("home.headline.line1")}
            <br />
            <span className="text-primary">{t("home.headline.line2")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
            {t("home.lede")}
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href={appRoutes.overview}
              className={buttonVariants({ size: "lg" })}
            >
              {t("home.cta.openApp")} <span aria-hidden>↗</span>
            </Link>
            <Link
              href={appRoutes.createGrant}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              {t("home.cta.createGrant")}
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            {/* Network name is a protocol literal. */}
            {t("home.note", { network: hskTestnet.name })}
          </p>
        </div>
        <div className="relative overflow-hidden border border-border bg-surface-1 p-6 lg:col-span-5 lg:ml-8 sm:p-8">
          <DataArt
            variant="mesh"
            className="absolute -right-8 -top-2 h-36 w-48 opacity-70"
          />
          <p className="relative z-10 mb-7 font-mono text-[10px] font-medium uppercase tracking-[.08em] text-muted-foreground">
            {t("home.steps.title")}
          </p>
          <div className="space-y-4">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-card border border-border-soft bg-surface-2 p-4"
              >
                <span className="font-mono text-xs text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-mono text-sm">
                    {t(`home.steps.${step}.title`)}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t(`home.steps.${step}.body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ProductModelPresentation t={t} variant="summary" />
      <section>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-mono text-[22px] font-normal tracking-tight">
            {t("home.strategies.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("home.strategies.audience")}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {STRATEGIES.map((strategy) => (
            <Card key={strategy}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t(`home.strategies.${strategy}.title`)}
                </CardTitle>
                <p className="pt-2 text-sm font-medium text-primary">
                  {t(`home.strategies.${strategy}.subtitle`)}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">
                  {t(`home.strategies.${strategy}.body`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
