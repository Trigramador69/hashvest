import Link from "next/link";

import { DataArt } from "@/components/ui/data-art";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import type { Translator } from "@/lib/shared/i18n/dictionary";
import {
  PRODUCT_ADDONS,
  PRODUCT_PLANS,
  PRODUCT_SURFACES,
  type CapabilityStatus,
  type ProductCapability,
  type ProductPlan,
  type ProductSurface,
} from "@/lib/shared/product-model";

type ProductModelPresentationProps = {
  t: Translator;
  variant: "summary" | "detail";
};

function StatusLabel({
  status,
  t,
}: {
  status: CapabilityStatus;
  t: Translator;
}) {
  const roadmap = status === "roadmap";
  return (
    <span
      className={
        roadmap
          ? "shrink-0 border border-[rgba(77,106,217,.35)] px-2 py-1 font-mono text-[9px] uppercase tracking-[.06em] text-[#9eafff]"
          : "shrink-0 border border-[rgba(87,217,139,.3)] px-2 py-1 font-mono text-[9px] uppercase tracking-[.06em] text-primary"
      }
    >
      {t(roadmap ? "productModel.status.roadmap" : "productModel.status.demo")}
    </span>
  );
}

function CapabilityList({
  features,
  t,
  compact = false,
}: {
  features: readonly ProductCapability[];
  t: Translator;
  compact?: boolean;
}) {
  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {features.map((feature) => (
        <li
          key={feature.id}
          className="flex items-start justify-between gap-3 border-t border-border-soft pt-3 first:border-t-0 first:pt-0"
        >
          <span className="flex min-w-0 items-start gap-2 text-xs leading-5 text-muted-foreground">
            <span
              aria-hidden="true"
              className={
                feature.status === "roadmap"
                  ? "mt-[7px] size-1.5 shrink-0 bg-[#4d6ad9]"
                  : "mt-[7px] size-1.5 shrink-0 rounded-full bg-primary"
              }
            />
            <span>{t(feature.label)}</span>
          </span>
          <StatusLabel status={feature.status} t={t} />
        </li>
      ))}
    </ul>
  );
}

function SurfacePanel({
  surface,
  t,
  compact = false,
}: {
  surface: ProductSurface;
  t: Translator;
  compact?: boolean;
}) {
  const protocol = surface.id === "protocol";
  const features = compact ? surface.features.slice(0, 4) : surface.features;
  return (
    <Panel className="relative overflow-hidden" id={`product-${surface.id}`}>
      <DataArt
        variant={protocol ? "nodes" : "mesh"}
        accent={protocol ? "blue" : "green"}
        className="absolute -right-4 -top-2 h-32 w-52 opacity-60 sm:h-40 sm:w-64"
      />
      <PanelHeader
        eyebrow={protocol ? "PROTOCOL" : "CLOUD"}
        title={t(surface.title)}
        description={t(surface.tagline)}
        className="relative z-10"
      />
      <PanelBody className="relative z-10 space-y-5">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(surface.body)}
        </p>
        <CapabilityList features={features} t={t} compact={compact} />
        <Link
          href={surface.href}
          className="inline-flex min-h-9 items-center border border-border px-3 font-mono text-xs text-foreground transition-colors hover:border-border-strong hover:bg-surface-2"
        >
          {t(surface.cta)} <span aria-hidden="true">↗</span>
        </Link>
      </PanelBody>
    </Panel>
  );
}

function PlanCard({
  plan,
  t,
  compact = false,
}: {
  plan: ProductPlan;
  t: Translator;
  compact?: boolean;
}) {
  const features = compact ? plan.features.slice(0, 3) : plan.features;
  return (
    <article
      className="flex h-full flex-col border border-border bg-surface-1 p-5 transition-[background,border-color,transform] duration-180 hover:-translate-y-px hover:border-border-strong hover:bg-surface-hover"
      data-plan={plan.id}
    >
      <header className="mb-5 border-b border-border-soft pb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[.08em] text-primary">
            {t("productModel.plan.label")}
          </p>
          {plan.id === "team" && (
            <span className="border border-[rgba(87,217,139,.3)] px-2 py-1 font-mono text-[9px] uppercase tracking-[.06em] text-primary">
              {t("productModel.plan.team.recommended")}
            </span>
          )}
        </div>
        <h3 className="font-mono text-[22px] font-normal tracking-[-.03em]">
          {t(plan.title)}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t(plan.tagline)}
        </p>
      </header>
      <CapabilityList features={features} t={t} compact={compact} />
    </article>
  );
}

function PlansGrid({
  t,
  compact = false,
}: {
  t: Translator;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {PRODUCT_PLANS.map((plan) => (
        <PlanCard key={plan.id} plan={plan} t={t} compact={compact} />
      ))}
    </div>
  );
}

function Addons({ t }: { t: Translator }) {
  return (
    <section
      aria-labelledby="product-model-addons-heading"
      className="space-y-5"
    >
      <header className="max-w-2xl">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[.08em] text-primary">
          {t("productModel.addons.eyebrow")}
        </p>
        <h2
          id="product-model-addons-heading"
          className="font-mono text-[22px] font-normal tracking-tight"
        >
          {t("productModel.addons.title")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("productModel.addons.lede")}
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {PRODUCT_ADDONS.map((addon) => (
          <article
            key={addon.id}
            className="border border-border bg-surface-1 p-5"
            data-addon={addon.id}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span aria-hidden="true" className="size-2 bg-[#4d6ad9]" />
              <StatusLabel status="roadmap" t={t} />
            </div>
            <h3 className="font-mono text-[15px] font-medium">
              {t(addon.title)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t(addon.body)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProductModelPresentation({
  t,
  variant,
}: ProductModelPresentationProps) {
  if (variant === "summary") {
    return (
      <section
        id="product-model"
        aria-labelledby="product-model-heading"
        className="space-y-8 border-t border-border-soft pt-16"
      >
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[.08em] text-primary">
              {t("productModel.eyebrow")}
            </p>
            <h2
              id="product-model-heading"
              className="font-mono text-[clamp(28px,4vw,42px)] font-normal leading-[1.05] tracking-[-.04em]"
            >
              {t("productModel.title")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {t("productModel.lede")}
            </p>
          </div>
          <Link
            href="/plans"
            className="inline-flex min-h-10 items-center border border-border px-4 font-mono text-xs text-foreground transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            {t("productModel.summaryLink")} <span aria-hidden="true">↗</span>
          </Link>
        </header>
        <div className="grid gap-3 lg:grid-cols-2">
          {PRODUCT_SURFACES.map((surface) => (
            <SurfacePanel key={surface.id} surface={surface} t={t} compact />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {PRODUCT_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} t={t} compact />
          ))}
        </div>
        <p className="border-l border-primary pl-3 text-xs leading-5 text-muted-foreground">
          {t("productModel.disclaimer")}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-16 py-2 sm:py-8">
      <header className="max-w-3xl">
        <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[.08em] text-primary">
          {t("productModel.detail.eyebrow")}
        </p>
        <h1 className="font-display text-[clamp(42px,6vw,68px)] font-normal leading-[.98] tracking-[-.06em]">
          {t("productModel.detail.title")}
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">
          {t("productModel.detail.lede")}
        </p>
        <p className="mt-5 max-w-2xl border-l border-primary pl-3 text-xs leading-5 text-muted-foreground">
          {t("productModel.disclaimer")}
        </p>
      </header>

      <section
        aria-labelledby="product-model-surfaces-heading"
        className="space-y-5"
      >
        <header>
          <h2
            id="product-model-surfaces-heading"
            className="font-mono text-[22px] font-normal tracking-tight"
          >
            {t("productModel.surfaces.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("productModel.surfaces.lede")}
          </p>
        </header>
        <div className="grid gap-3 lg:grid-cols-2">
          {PRODUCT_SURFACES.map((surface) => (
            <SurfacePanel key={surface.id} surface={surface} t={t} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="product-model-plans-heading"
        className="space-y-5"
      >
        <header>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[.08em] text-primary">
            {t("productModel.plans.eyebrow")}
          </p>
          <h2
            id="product-model-plans-heading"
            className="font-mono text-[22px] font-normal tracking-tight"
          >
            {t("productModel.plans.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("productModel.plans.lede")}
          </p>
        </header>
        <PlansGrid t={t} />
      </section>

      <Addons t={t} />
    </div>
  );
}
