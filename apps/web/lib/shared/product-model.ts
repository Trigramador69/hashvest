import type { TranslationKey } from "@/lib/shared/i18n/dictionaries/en";

/**
 * Product packaging is presentation metadata only. It must never become an
 * authorization, billing, metering, or onchain decision.
 */
export type CapabilityStatus = "demo" | "roadmap";

export type ProductCapability = {
  id: string;
  label: TranslationKey;
  status: CapabilityStatus;
};

export type ProductSurface = {
  id: "protocol" | "cloud";
  title: TranslationKey;
  tagline: TranslationKey;
  body: TranslationKey;
  features: readonly ProductCapability[];
  cta: TranslationKey;
  href: "/grants/new" | "/app";
};

export type ProductPlan = {
  id: "free" | "team" | "enterprise";
  title: TranslationKey;
  tagline: TranslationKey;
  features: readonly ProductCapability[];
};

export type ProductAddon = {
  id: "sponsoredGas" | "aiCredits" | "complianceChecks";
  title: TranslationKey;
  body: TranslationKey;
};

export const PRODUCT_SURFACES: readonly ProductSurface[] = [
  {
    id: "protocol",
    title: "productModel.protocol.title",
    tagline: "productModel.protocol.tagline",
    body: "productModel.protocol.body",
    features: [
      {
        id: "programmable-grants",
        label: "productModel.protocol.feature.0",
        status: "demo",
      },
      {
        id: "fully-funded-vaults",
        label: "productModel.protocol.feature.1",
        status: "demo",
      },
      {
        id: "hsk-authority",
        label: "productModel.protocol.feature.2",
        status: "demo",
      },
    ],
    cta: "productModel.protocol.cta",
    href: "/grants/new",
  },
  {
    id: "cloud",
    title: "productModel.cloud.title",
    tagline: "productModel.cloud.tagline",
    body: "productModel.cloud.body",
    features: [
      {
        id: "organizations",
        label: "productModel.cloud.feature.0",
        status: "demo",
      },
      {
        id: "members",
        label: "productModel.cloud.feature.1",
        status: "demo",
      },
      {
        id: "standard-templates",
        label: "productModel.cloud.feature.2",
        status: "demo",
      },
      {
        id: "review-queues",
        label: "productModel.cloud.feature.3",
        status: "demo",
      },
      {
        id: "reporting",
        label: "productModel.cloud.feature.4",
        status: "demo",
      },
      {
        id: "batch-grants",
        label: "productModel.cloud.feature.5",
        status: "demo",
      },
      {
        id: "ai-assistance",
        label: "productModel.cloud.feature.6",
        status: "demo",
      },
      {
        id: "custom-template-ux",
        label: "productModel.cloud.feature.7",
        status: "roadmap",
      },
      {
        id: "sponsored-claims",
        label: "productModel.cloud.feature.8",
        status: "roadmap",
      },
      {
        id: "enterprise-controls",
        label: "productModel.cloud.feature.9",
        status: "roadmap",
      },
    ],
    cta: "productModel.cloud.cta",
    href: "/app",
  },
] as const;

export const PRODUCT_PLANS: readonly ProductPlan[] = [
  {
    id: "free",
    title: "productModel.plan.free.title",
    tagline: "productModel.plan.free.tagline",
    features: [
      {
        id: "free-organizations",
        label: "productModel.plan.free.feature.0",
        status: "roadmap",
      },
      {
        id: "free-members-grants",
        label: "productModel.plan.free.feature.1",
        status: "roadmap",
      },
      {
        id: "free-templates",
        label: "productModel.plan.free.feature.2",
        status: "demo",
      },
      {
        id: "free-workspace",
        label: "productModel.plan.free.feature.3",
        status: "demo",
      },
    ],
  },
  {
    id: "team",
    title: "productModel.plan.team.title",
    tagline: "productModel.plan.team.tagline",
    features: [
      {
        id: "team-members-grants",
        label: "productModel.plan.team.feature.0",
        status: "roadmap",
      },
      {
        id: "team-templates",
        label: "productModel.plan.team.feature.1",
        status: "roadmap",
      },
      {
        id: "team-batch-grants",
        label: "productModel.plan.team.feature.2",
        status: "demo",
      },
      {
        id: "team-sponsored-claims",
        label: "productModel.plan.team.feature.3",
        status: "roadmap",
      },
      {
        id: "team-reports-ai",
        label: "productModel.plan.team.feature.4",
        status: "roadmap",
      },
      {
        id: "team-ai-builder",
        label: "productModel.plan.team.feature.5",
        status: "demo",
      },
    ],
  },
  {
    id: "enterprise",
    title: "productModel.plan.enterprise.title",
    tagline: "productModel.plan.enterprise.tagline",
    features: [
      {
        id: "enterprise-limits",
        label: "productModel.plan.enterprise.feature.0",
        status: "roadmap",
      },
      {
        id: "enterprise-permissions",
        label: "productModel.plan.enterprise.feature.1",
        status: "roadmap",
      },
      {
        id: "enterprise-compliance",
        label: "productModel.plan.enterprise.feature.2",
        status: "roadmap",
      },
      {
        id: "enterprise-support",
        label: "productModel.plan.enterprise.feature.3",
        status: "roadmap",
      },
      {
        id: "enterprise-integrations",
        label: "productModel.plan.enterprise.feature.4",
        status: "roadmap",
      },
    ],
  },
] as const;

export const PRODUCT_ADDONS: readonly ProductAddon[] = [
  {
    id: "sponsoredGas",
    title: "productModel.addon.sponsoredGas.title",
    body: "productModel.addon.sponsoredGas.body",
  },
  {
    id: "aiCredits",
    title: "productModel.addon.aiCredits.title",
    body: "productModel.addon.aiCredits.body",
  },
  {
    id: "complianceChecks",
    title: "productModel.addon.complianceChecks.title",
    body: "productModel.addon.complianceChecks.body",
  },
] as const;
