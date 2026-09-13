import { expect, test } from "@playwright/test";

/**
 * The shared confirmation dialog (HAS-46).
 *
 * What replaced window.confirm() has to be at least as usable as what it
 * replaced, and the part a unit test cannot see is the keyboard: a dialog that
 * covers the page and cannot be left traps whoever opened it.
 *
 * Not part of `pnpm ci:check`; run with `pnpm --filter @hashvest/web visual`.
 */
test.describe("confirmation dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visual/confirm-dialog", {
      waitUntil: "domcontentloaded",
    });
    // Wait for the fixture to become interactive; a key pressed before
    // hydration would be dropped by the page, not by the dialog.
    await expect(page.getByTestId("fixture")).toHaveAttribute(
      "data-ready",
      "true",
    );
  });

  const dialog = (page: import("@playwright/test").Page) =>
    page.getByRole("dialog");

  test("asks before acting, and only acts when confirmed", async ({ page }) => {
    await page.getByRole("button", { name: "Remove member" }).first().click();
    await expect(dialog(page)).toBeVisible();
    // Nothing has happened yet: opening the dialog is not the action.
    await expect(page.getByTestId("confirmed")).toHaveText("confirmed: 0");

    await dialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByTestId("confirmed")).toHaveText("confirmed: 0");
    await expect(page.getByTestId("cancelled")).toHaveText("cancelled: 1");

    await page.getByRole("button", { name: "Remove member" }).first().click();
    await dialog(page).getByRole("button", { name: "Remove" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByTestId("confirmed")).toHaveText("confirmed: 1");
  });

  test("is labelled, takes focus on cancel, and is reachable by keyboard", async ({
    page,
  }) => {
    const opener = page.getByRole("button", { name: "Remove member" }).first();
    await opener.focus();
    await page.keyboard.press("Enter");

    await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
    await expect(dialog(page)).toHaveAccessibleName("Remove member");
    await expect(dialog(page)).toHaveAccessibleDescription(
      "Remove this member from the organization?",
    );

    // The destructive half is never what a keyboard user lands on first.
    await expect(
      dialog(page).getByRole("button", { name: "Cancel" }),
    ).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(
      dialog(page).getByRole("button", { name: "Remove" }),
    ).toBeFocused();

    // Tab wraps inside the dialog rather than escaping to the page behind it.
    await page.keyboard.press("Tab");
    await expect(
      dialog(page).getByRole("button", { name: "Cancel" }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog(page).getByRole("button", { name: "Remove" }),
    ).toBeFocused();
  });

  test("leaves on Escape and gives focus back to what opened it", async ({
    page,
  }) => {
    const opener = page.getByRole("button", { name: "Remove member" }).first();
    await opener.focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByTestId("confirmed")).toHaveText("confirmed: 0");
    await expect(opener).toBeFocused();
  });
});
