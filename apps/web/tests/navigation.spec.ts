import { expect, test } from "@playwright/test";

test.describe("application information architecture", () => {
  test("exposes only working primary destinations", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    const navigation = page.getByRole("navigation", {
      name: "Main navigation",
    });
    await expect(navigation.getByRole("link")).toHaveCount(4);
    await expect(
      navigation.getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("href", "/app");
    await expect(
      navigation.getByRole("link", { name: "Grants" }),
    ).toHaveAttribute("href", "/app/grants");
    await expect(
      navigation.getByRole("link", { name: "Organizations" }),
    ).toHaveAttribute("href", "/app/organizations");
    await expect(
      navigation.getByRole("link", { name: "Settings" }),
    ).toHaveAttribute("href", "/app/settings");
    await expect(navigation.getByText("Projects")).toHaveCount(0);
    await expect(navigation.getByText("Data")).toHaveCount(0);
    await expect(navigation.getByText("Models")).toHaveCount(0);
    await expect(navigation.getByText("Insights")).toHaveCount(0);
    await expect(navigation.getByText("Team")).toHaveCount(0);
  });

  test("keeps organizations as a first-class surface", async ({ page }) => {
    await page.goto("/app/organizations", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Organizations." }),
    ).toBeVisible();

    await page.goto("/app/settings", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Settings." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Organizations." }),
    ).toHaveCount(0);

    await page.goto("/app/settings/organizations/new", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/app\/organizations\/new$/);

    await page.goto(
      "/app/settings/organizations/00000000-0000-0000-0000-000000000000/grants",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page).toHaveURL(
      /\/app\/organizations\/00000000-0000-0000-0000-000000000000\/grants$/,
    );
  });
});
