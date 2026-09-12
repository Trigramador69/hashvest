import Link from "next/link";

import { hskTestnet } from "@hashvest/web3";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "@/lib/shared/i18n/server";

/** Step and strategy cards are key triples; the copy lives in the dictionary. */
const STEPS = ["fund", "unlock", "claim"] as const;
const STRATEGIES = ["time", "milestone", "hybrid"] as const;

export default async function Home() {
  const { t } = await getTranslations();
  return (
    <div className="space-y-16 py-7 sm:py-12">
      <section className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-6 text-xs font-semibold uppercase tracking-[.2em] text-primary">
            {t("home.eyebrow")}
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            {t("home.headline.line1")}
            <br />
            <span className="text-primary">{t("home.headline.line2")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            {t("home.lede")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app" className={buttonVariants({ size: "lg" })}>
              {t("home.cta.openApp")} <span aria-hidden>↗</span>
            </Link>
            <Link
              href="/grants/new"
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
        <div className="rounded-2xl border bg-secondary/60 p-7 sm:p-10">
          <p className="mb-7 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("home.steps.title")}
          </p>
          <div className="space-y-4">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-xl border bg-card p-5"
              >
                <span className="text-sm font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold">
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
      <section>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("home.strategies.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("home.strategies.audience")}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
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
