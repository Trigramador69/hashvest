import { expect, test } from "@playwright/test";

/**
 * The app shell driven by keyboard only.
 *
 * The mobile drawer is a focus trap in practice: it covers the page, so a
 * keyboard user who cannot close it or reach its links is stuck. Nothing but a
 * browser can show that.
 *
 * Not part of `pnpm ci:check`; run with `pnpm --filter @hashvest/web visual`.
 */
test.describe("keyboard access to the shell", () => {
  test("opens, walks and closes the mobile navigation without a mouse", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    const opener = page.getByRole("button", { name: "Open navigation" });
    await opener.focus();
    await page.keyboard.press("Enter");

    const drawer = page.getByRole("navigation", { name: "Main navigation" });
    await expect(drawer).toBeVisible();
    // The sliding element is the aside around the nav, not the nav itself.
    const panel = page.getByRole("complementary");
    await expect.poll(async () => (await panel.boundingBox())?.x).toBe(0);

    // Every primary destination is reachable by tabbing from the drawer.
    const reached: string[] = [];
    for (let step = 0; step < 12; step += 1) {
      await page.keyboard.press("Tab");
      const label = await page.evaluate(() =>
        document.activeElement?.textContent?.trim(),
      );
      if (label) reached.push(label);
    }
    for (const destination of [
      "Overview",
      "Grants",
      "Organizations",
      "Settings",
    ]) {
      expect(reached).toContain(destination);
    }

    await page.keyboard.press("Escape");
    await expect
      .poll(async () => (await panel.boundingBox())?.x)
      .toBeLessThan(0);
  });

  test("keeps a visible focus ring on the primary destinations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    const link = page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Grants" });
    await link.focus();

    const ring = await link.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
        background: style.backgroundColor,
      };
    });
    const hasVisibleFocus =
      parseFloat(ring.outlineWidth) > 0 ||
      ring.boxShadow !== "none" ||
      !/rgba\(0, 0, 0, 0\)/.test(ring.background);
    expect(hasVisibleFocus).toBe(true);
  });
});
