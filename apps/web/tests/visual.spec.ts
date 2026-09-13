import { test, expect } from "@playwright/test";

test.describe("design refactor visual contract", () => {
  test("landing page keeps the dark public shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      "/icon.svg",
    );
    await expect(page).toHaveScreenshot("landing-desktop.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  for (const locale of [
    { code: "en", label: "Choose language" },
    { code: "es", label: "Elegir idioma" },
    { code: "zh-CN", label: "选择语言" },
  ] as const) {
    test(`language picker uses an accessible custom popup in ${locale.code}`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        {
          name: "hashvest_locale",
          value: locale.code,
          domain: "127.0.0.1",
          path: "/",
        },
      ]);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const picker = page.getByRole("combobox").first();

      await expect(picker).toHaveAccessibleName(locale.label);
      await expect(picker).toBeVisible();
      expect(await picker.evaluate((element) => element.tagName)).toBe(
        "BUTTON",
      );
      await picker.click();
      await expect(
        page.getByRole("option", { name: "Español", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(picker).toBeFocused();
    });
  }

  test("disconnected dashboard is usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /grants, with purpose/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page).toHaveScreenshot("dashboard-mobile-nav.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("connected dashboard matches desktop reference", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/visual/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Grant activity" }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-connected-desktop.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("connected dashboard reflows to a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/visual/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Grant activity" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page).toHaveScreenshot("dashboard-connected-mobile.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("dashboard entrance motion respects reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/visual/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator(".dashboard-reveal-stagger > *").first(),
    ).toHaveCSS("animation-name", "none");
  });
});
