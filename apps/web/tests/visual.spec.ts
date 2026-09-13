import { test, expect } from "@playwright/test";

test.describe("design refactor visual contract", () => {
  test("landing page keeps the dark public shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveScreenshot("landing-desktop.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("disconnected dashboard is usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /grants, with purpose/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("navigation", { name: "Main navigation" });
    await expect(drawer).toBeVisible();
    // The sliding element is the aside around the nav, not the nav itself.
    const panel = page.getByRole("complementary");
    // The drawer slides in over 180ms. Visible is true from the first frame of
    // that transition, so wait for the slide to actually settle before
    // comparing pixels.
    await expect.poll(async () => (await panel.boundingBox())?.x).toBe(0);
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
});
