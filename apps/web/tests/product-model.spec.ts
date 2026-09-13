import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3100";

const LOCALES = [
  {
    code: "en",
    htmlLang: "en",
    heading: "Three paths for every grant team.",
    demo: "Available in demo",
    roadmap: "Roadmap",
    disclaimer:
      "Presentation only. This demo has no billing, checkout, metering, plan assignment, or enforced limits.",
    protocolCta: "Create a protocol grant",
    cloudCta: "Open the workspace",
  },
  {
    code: "es",
    htmlLang: "es",
    heading: "Tres caminos para cada equipo de grants.",
    demo: "Disponible en la demo",
    roadmap: "Hoja de ruta",
    disclaimer:
      "Solo presentación. Esta demo no tiene billing, checkout, medición de uso, asignación de planes ni límites aplicados.",
    protocolCta: "Crear una concesión del Protocol",
    cloudCta: "Abrir el espacio de trabajo",
  },
  {
    code: "zh-CN",
    htmlLang: "zh-Hans",
    heading: "适合每个资助团队的三条路径。",
    demo: "演示中可用",
    roadmap: "路线图",
    disclaimer:
      "仅用于展示。本演示不包含计费、结账、用量统计、方案分配或强制执行的限制。",
    protocolCta: "创建 Protocol 资助",
    cloudCta: "打开工作区",
  },
] as const;

async function useLocale(page: Page, locale: string) {
  await page
    .context()
    .addCookies([{ name: "hashvest_locale", value: locale, url: BASE_URL }]);
}

for (const locale of LOCALES) {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`/plans ${locale.code} ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await useLocale(page, locale.code);
      await page.goto("/plans", { waitUntil: "domcontentloaded" });

      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        locale.htmlLang,
      );
      await expect(
        page.getByRole("heading", { level: 1, name: locale.heading }),
      ).toBeVisible();
      await expect(
        page.getByText(locale.demo, { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText(locale.roadmap, { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText(locale.disclaimer, { exact: true }),
      ).toBeVisible();

      await expect(
        page
          .locator('a[href="/grants/new"]')
          .filter({ hasText: locale.protocolCta }),
      ).toBeVisible();
      await expect(
        page
          .locator('a[href="/app"]')
          .filter({ hasText: locale.cloudCta })
          .first(),
      ).toBeVisible();

      await expect(page.locator("form")).toHaveCount(0);
      const hrefs = await page
        .locator("a")
        .evaluateAll((links) =>
          links.map((link) => link.getAttribute("href") ?? ""),
        );
      expect(hrefs.some((href) => /billing|checkout|stripe/i.test(href))).toBe(
        false,
      );

      await expect(page).toHaveScreenshot(
        `product-model-${locale.code}-${viewport.name}.png`,
        {
          fullPage: true,
          animations: "disabled",
        },
      );
    });
  }
}

test("landing links to the localized product model", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/plans"]')).toHaveCount(2);
  await expect(page.locator('a[href="/plans"]').first()).toBeVisible();
  await expect(page.locator("#product-model")).toBeVisible();
});
