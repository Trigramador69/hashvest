import { describe, expect, it } from "vitest";

import {
  PRODUCT_ADDONS,
  PRODUCT_PLANS,
  PRODUCT_SURFACES,
  type CapabilityStatus,
} from "./product-model";

const STATUSES: CapabilityStatus[] = ["demo", "roadmap"];

describe("product model catalog", () => {
  it("keeps Protocol and Cloud capabilities explicitly classified", () => {
    expect(PRODUCT_SURFACES).toHaveLength(2);
    expect(PRODUCT_SURFACES.map((surface) => surface.id)).toEqual([
      "protocol",
      "cloud",
    ]);

    for (const surface of PRODUCT_SURFACES) {
      expect(surface.features.length).toBeGreaterThan(0);
      expect(surface.href).toMatch(/^\/(grants\/new|app)$/);
      for (const feature of surface.features) {
        expect(STATUSES).toContain(feature.status);
      }
    }
  });

  it("describes all three packaging paths without commercial controls", () => {
    expect(PRODUCT_PLANS.map((plan) => plan.id)).toEqual([
      "free",
      "team",
      "enterprise",
    ]);

    for (const plan of PRODUCT_PLANS) {
      expect(plan.features.length).toBeGreaterThan(0);
      expect(Object.keys(plan)).not.toContain("price");
      expect(Object.keys(plan)).not.toContain("limit");
      expect(Object.keys(plan)).not.toContain("entitlement");
      for (const feature of plan.features) {
        expect(STATUSES).toContain(feature.status);
      }
    }
  });

  it("keeps every optional add-on roadmap-only", () => {
    expect(PRODUCT_ADDONS.map((addon) => addon.id)).toEqual([
      "sponsoredGas",
      "aiCredits",
      "complianceChecks",
    ]);
    for (const addon of PRODUCT_ADDONS) {
      expect(Object.keys(addon)).not.toContain("price");
      expect(Object.keys(addon)).not.toContain("meter");
    }
  });
});
