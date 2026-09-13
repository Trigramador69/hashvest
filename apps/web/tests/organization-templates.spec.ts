import { test, expect, type Page } from "@playwright/test";

/**
 * The template editor in a browser, on a phone (HAS-13).
 *
 * The form's rules are covered by lib/shared/grant-presets/template-form.test.ts
 * and the routes by lib/cloud/organizations/template-routes.test.ts. What only
 * a browser can show is that each state is reachable and readable at 390px,
 * that switching strategy reveals the fields that strategy needs, and that an
 * invalid form never leaves the page: the guarded fixture has no workspace
 * session and no wallet, and this asserts that nothing is requested.
 *
 * Not part of `pnpm ci:check`; run with `pnpm --filter @hashvest/web visual`.
 */

/**
 * The form's own problem list. Scoped to the form because Next.js gives its
 * route announcer role="alert" too.
 */
const problems = (page: Page) => page.locator("form [role='alert']");

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Records every workspace write the page attempts, and every wallet call. */
async function trackRequests(page: Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/organizations"))
      requests.push(`${request.method()} ${request.url()}`);
  });
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { __walletCalls: string[] }).__walletCalls = calls;
    (window as unknown as { ethereum: unknown }).ethereum = {
      isMetaMask: true,
      on: () => {},
      removeListener: () => {},
      request: ({ method }: { method: string }) => {
        calls.push(method);
        return Promise.reject(new Error("no wallet in this test"));
      },
    };
  });
  return requests;
}

test.describe("organization template editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("refuses an empty form and names every problem", async ({ page }) => {
    const requests = await trackRequests(page);
    await page.goto("/visual/templates", { waitUntil: "domcontentloaded" });

    // Nothing is wrong until the reader tries to save.
    await expect(problems(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Save template" }).click();

    await expect(problems(page)).toContainText("Give the template a name");
    expect(requests).toEqual([]);
    await expect(page).toHaveScreenshot("template-editor-invalid-mobile.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("shows the fields each strategy needs, and the milestone total", async ({
    page,
  }) => {
    await trackRequests(page);
    await page.goto("/visual/templates", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Name", { exact: true }).fill("Partner integration");

    // Time vesting: a schedule, no milestones, no reviewer default.
    await expect(page.getByLabel("Cliff", { exact: true })).toBeVisible();
    await expect(page.getByText("Milestones", { exact: true })).toHaveCount(0);

    await choose(page, "Unlock strategy", "Milestone grant");
    await expect(page.getByLabel("Cliff", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Share (%)")).toBeVisible();
    await expect(page.getByLabel("Default reviewer")).toBeVisible();

    await page.getByLabel("Milestone 1").fill("Prototype");
    await page.getByLabel("Share (%)").fill("40");
    await expect(page.getByText("Total: 40%")).toBeVisible();

    await page.getByRole("button", { name: "Add milestone" }).click();
    await page.getByLabel("Milestone 2").fill("Launch");
    await page.getByLabel("Share (%)").nth(1).fill("60");
    await expect(page.getByText("Total: 100%")).toBeVisible();

    await page.getByRole("button", { name: "Save template" }).click();
    await expect(problems(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await expect(page).toHaveScreenshot("template-editor-saving-mobile.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("keeps a milestone split honest before anything is sent", async ({
    page,
  }) => {
    const requests = await trackRequests(page);
    await page.goto("/visual/templates", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Name", { exact: true }).fill("Partner integration");
    await choose(page, "Unlock strategy", "Milestone grant");
    await page.getByLabel("Milestone 1").fill("Integration");
    await page.getByLabel("Share (%)").fill("40");
    await page.getByRole("button", { name: "Save template" }).click();

    await expect(problems(page)).toContainText(
      "add up to 100%. They currently add up to 40%",
    );
    expect(requests).toEqual([]);
    const walletCalls = await page.evaluate(
      () =>
        (window as unknown as { __walletCalls: string[] }).__walletCalls ?? [],
    );
    // The shell probes for a connected account on load, as it does on every
    // page. Nothing here may ask the wallet to authorize or sign anything.
    expect(walletCalls.filter((method) => method !== "eth_accounts")).toEqual(
      [],
    );
  });
});
