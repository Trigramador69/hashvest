import { test, expect, type Page } from "@playwright/test";

/**
 * The AI draft panel's browser contract (HAS-18).
 *
 * The endpoint is stubbed, so this asserts what the UI does with an answer
 * rather than what a provider produces — the pipeline itself is covered by the
 * vitest suites under lib/. What cannot be covered there is the part that
 * matters most here: that a draft only ever prefills a form, and that no
 * wallet is asked for anything until the user submits the wizard themselves.
 *
 * Not part of `pnpm ci:check`; run with `pnpm --filter @hashvest/web visual`.
 */

const DRAFT = {
  preset: {
    key: "ai-draft",
    name: "AI draft",
    tagline: "Milestone grant for a scoped build.",
    description: "Milestone grant for a scoped build.",
    bestFor: [],
    strategy: 1,
    titleSuggestion: "Protocol integration grant",
    descriptionSuggestion: "Milestone grant for a scoped build.",
    allocationSuggestion: "600",
    timing: null,
    milestones: [
      { title: "Integration", percentOfAllocation: 40 },
      { title: "Launch", percentOfAllocation: 60 },
    ],
    reviewerRequired: true,
    assumptions: [
      "A reviewer approves each milestone before anything unlocks.",
    ],
  },
  assumptions: ["A reviewer approves each milestone before anything unlocks."],
  unsupported: ["A grant template cannot choose who receives the tokens."],
  adjustments: [
    { code: "requestAddressIgnored" },
    {
      code: "allocationClamped",
      values: { requested: "20000", maximum: "1000" },
    },
  ],
  needsConfirmation: ["beneficiary", "reviewer", "token"],
  source: "model",
};

/**
 * Records every wallet request the page makes.
 *
 * Nothing injects a wallet in this browser, so an unrecorded provider would
 * prove nothing; this makes the absence of a request an assertion rather than
 * an assumption.
 */
async function trackWalletRequests(page: Page) {
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
}

function walletCalls(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __walletCalls: string[] }).__walletCalls ?? [],
  );
}

async function openPanel(page: Page) {
  await page.goto("/grants/new", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Draft a grant from a description" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("AI grant draft panel", () => {
  test.beforeEach(async ({ page }) => {
    await trackWalletRequests(page);
  });

  test("prefills the wizard from a draft without touching a wallet", async ({
    page,
  }) => {
    await page.route("**/api/ai/grant-draft", (route) =>
      route.fulfill({ json: { draft: DRAFT } }),
    );
    await openPanel(page);

    await page
      .getByLabel("What should this grant do?")
      .fill("A grant for a protocol integration, released against milestones");
    await page.getByRole("button", { name: "Draft it" }).click();

    await expect(page.getByText("Protocol integration grant")).toBeVisible();
    // Everything the draft refused to decide is stated before it is applied.
    await expect(page.getByText("You still choose")).toBeVisible();
    await expect(page.getByText("The beneficiary wallet")).toBeVisible();
    await expect(page.getByText("Not supported")).toBeVisible();
    await expect(
      page.getByText("Ignored the wallet address in your request.", {
        exact: false,
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Apply to the wizard" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // The wizard is on its own Grant step with the drafted values in place,
    // and every one of them is an ordinary editable input.
    const title = page.getByLabel("Grant title");
    await expect(title).toHaveValue("Protocol integration grant");
    await title.fill("Edited by hand");
    await expect(title).toHaveValue("Edited by hand");

    expect(await walletCalls(page)).not.toContain("eth_sendTransaction");
    expect(await walletCalls(page)).not.toContain("personal_sign");
  });

  test("leaves the manual wizard usable when the provider fails", async ({
    page,
  }) => {
    await page.route("**/api/ai/grant-draft", (route) =>
      route.fulfill({ status: 503, json: { error: "unavailable" } }),
    );
    await openPanel(page);

    await page
      .getByLabel("What should this grant do?")
      .fill("A six-month grant for a developer, 500 tokens");
    await page.getByRole("button", { name: "Draft it" }).click();

    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "The wizard below still works.",
    );
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    // The hand-written presets are untouched and still one click away.
    await expect(page.getByText("Builder Grant")).toBeVisible();
    await expect(page.getByText("Custom / blank")).toBeVisible();
  });

  test("rejects a rate-limited request with the wait it actually has", async ({
    page,
  }) => {
    await page.route("**/api/ai/grant-draft", (route) =>
      route.fulfill({
        status: 429,
        json: { error: "too many", retryAfterSeconds: 42 },
      }),
    );
    await openPanel(page);

    await page
      .getByLabel("What should this grant do?")
      .fill("Another draft, please");
    await page.getByRole("button", { name: "Draft it" }).click();

    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "42 seconds",
    );
  });

  test("drafts on Enter and writes a new line on Shift+Enter", async ({
    page,
  }) => {
    let requests = 0;
    await page.route("**/api/ai/grant-draft", (route) => {
      requests += 1;
      return route.fulfill({ json: { draft: DRAFT } });
    });
    await openPanel(page);

    const prompt = page.getByLabel("What should this grant do?");
    await prompt.fill("A six-month developer grant for 500 tokens");
    await prompt.press("Enter");

    await expect(page.getByText("Protocol integration grant")).toBeVisible();
    expect(requests).toBe(1);
    expect(await prompt.inputValue()).not.toContain("\n");

    // Shift+Enter is still a new line, not a second request.
    await page.getByRole("button", { name: "Discard" }).click();
    await prompt.fill("first line");
    await prompt.press("Shift+Enter");
    expect(await prompt.inputValue()).toContain("\n");
    expect(requests).toBe(1);
  });

  test("keeps every control legible", async ({ page }) => {
    // `--secondary` is `--surface-2`, a near-black background. Used as a text
    // colour it rendered the ghost button at a 1.04:1 contrast ratio, which is
    // invisible; nothing but a computed-style check catches that. Each control
    // is measured against whatever it actually sits on — the panel for a
    // transparent one, its own fill for a solid one.
    await openPanel(page);

    const luminance = (css: string) => {
      const [r, g, b] = css.match(/\d+/g)!.map(Number);
      const channel = (v: number) =>
        v / 255 <= 0.03928
          ? v / 255 / 12.92
          : ((v / 255 + 0.055) / 1.055) ** 2.4;
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const ratio = (a: number, b: number) => {
      const [light, dark] = [a, b].sort((x, y) => y - x);
      return (light + 0.05) / (dark + 0.05);
    };

    const panel = luminance(
      await page
        .getByRole("dialog")
        .evaluate((node) => getComputedStyle(node).backgroundColor),
    );

    for (const name of ["Close the draft panel", "Draft it"]) {
      const { color, background } = await page
        .getByRole("button", { name })
        .evaluate((node) => {
          const style = getComputedStyle(node);
          return { color: style.color, background: style.backgroundColor };
        });
      // A transparent fill means the control is read against the panel itself.
      const behind = /rgba?\([^)]*,\s*0\s*\)/.test(background)
        ? panel
        : luminance(background);
      expect(ratio(luminance(color), behind)).toBeGreaterThan(4.5);
    }
  });

  test("matches the panel reference", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/ai/grant-draft", (route) =>
      route.fulfill({ json: { draft: DRAFT } }),
    );
    await openPanel(page);
    await page
      .getByLabel("What should this grant do?")
      .fill("A grant for a protocol integration, released against milestones");
    await page.getByRole("button", { name: "Draft it" }).click();
    await expect(page.getByText("Protocol integration grant")).toBeVisible();

    await expect(page.getByRole("dialog")).toHaveScreenshot(
      "ai-grant-builder-draft.png",
      { animations: "disabled" },
    );
  });
});
