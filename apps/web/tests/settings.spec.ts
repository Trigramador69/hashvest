import { expect, test } from "@playwright/test";

/**
 * The workspace settings surface in a browser.
 *
 * The dictionaries themselves are covered by unit tests. What only a browser
 * can show is that the language control actually reaches the server, that the
 * choice survives a navigation, and that Settings keeps linking to the
 * sponsored-claim policy of each organization rather than duplicating it.
 *
 * Not part of `pnpm ci:check`; run with `pnpm --filter @hashvest/web visual`.
 */
test.describe("workspace settings", () => {
  test("groups the session-wide choices and nothing else", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/app/settings", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Settings." }),
    ).toBeVisible();
    for (const section of ["Language", "Sponsored claims", "Product model"]) {
      await expect(
        page.getByRole("heading", { name: section, exact: true }),
      ).toBeVisible();
    }

    // Organizations are a first-class destination, not a settings subsection.
    await expect(
      page.getByRole("heading", { name: "Organizations." }),
    ).toHaveCount(0);
  });

  test("changes the language of the whole shell and keeps it", async ({
    page,
  }) => {
    await page.goto("/app/settings", { waitUntil: "domcontentloaded" });

    // The shell header carries one too; this is the one on the page itself.
    const language = page.getByRole("main").getByLabel("Choose language");
    await expect(language).toBeVisible();
    await language.click();
    await page.getByRole("option", { name: "Español", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Configuración." }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    // Both switchers report the same session choice.
    await expect(
      page.getByRole("banner").getByLabel(/idioma|language/i),
    ).toHaveText("Español");

    // The choice is session state, not a one-render accident.
    await page.goto("/app/grants", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });
});
