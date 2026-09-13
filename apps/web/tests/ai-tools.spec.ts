import { expect, test, type Page } from "@playwright/test";

const template = {
  name: "Release template",
  description: "Two reviewed milestones",
  strategy: 1,
  schedule: null,
  milestones: [
    { title: "Prototype", percentOfAllocation: 40 },
    { title: "Release", percentOfAllocation: 60 },
  ],
  allocationSuggestion: "500",
  defaultReviewerMemberId: null,
};
const templateResponse = {
  draft: {
    template,
    assumptions: ["The owner will choose the reviewer."],
    unsupported: [],
    redacted: false,
  },
  unavailable: false,
};
const statement = (text: string, sourceIds = ["chain"]) => ({
  text,
  sourceIds,
});
const reviewResponse = {
  review: {
    summary: [statement("The release milestone is pending.")],
    findings: [statement("The note reports failing tests.", ["evidence-0"])],
    questions: [statement("Can you supply passing tests?", ["evidence-0"])],
    uncertainty: [
      statement("The linked content was not read.", ["evidence-0"]),
    ],
    recommendation: {
      value: "request_information",
      rationale: statement("More evidence is needed.", ["evidence-0"]),
    },
  },
  snapshot: {
    blockNumber: "123",
    blockTimestamp: 1789257600,
    title: "Integration",
    strategy: 1,
    totalAllocation: "100",
    claimedAmount: "0",
    unlockedAmount: "0",
    claimableAmount: "0",
    revoked: false,
    milestones: [
      { index: 0, title: "Release", amount: "100", approved: false },
    ],
  },
  sources: [
    {
      id: "chain",
      kind: "chain",
      href: "https://testnet-explorer.hskchain.net/address/0x0000000000000000000000000000000000000003",
      updatedAt: "2026-09-13T00:00:00Z",
    },
    {
      id: "evidence-0",
      kind: "evidence",
      milestoneIndex: 0,
      href: "https://example.org/evidence",
      updatedAt: "2026-09-12T00:00:00Z",
    },
  ],
  checkedAt: "2026-09-13T12:00:00Z",
  missingNotes: false,
  redacted: false,
};
const reportResponse = {
  report: {
    summary: [statement("One grant is active.", ["lifecycle"])],
    watchlist: [statement("A cliff releases next week.", ["unlocks"])],
    uncertainty: [
      statement("Amounts are HVT and were not converted.", ["token-0"]),
    ],
  },
  sources: [
    { id: "lifecycle", kind: "lifecycle", anchor: "report-lifecycle" },
    { id: "viewer", kind: "viewer", anchor: "report-viewer" },
    { id: "token-0", kind: "token", anchor: "report-tokens", symbol: "HVT" },
    { id: "unlocks", kind: "unlocks", anchor: "report-upcoming" },
  ],
  facts: {
    associatedGrants: 1,
    readableGrants: 1,
    includedGrants: 1,
    omittedGrants: 0,
    partial: false,
    lifecycle: { active: 1, completed: 0, revoked: 0 },
    viewer: { pendingReviews: 1, claimableGrants: 0 },
    tokenGroups: [
      {
        sourceId: "token-0",
        symbol: "HVT",
        grantCount: 1,
        totalAllocation: "100",
        unlockedAmount: "0",
        unvestedAmount: "100",
        claimedAmount: "0",
        claimableAmount: "0",
      },
    ],
    upcomingUnlocks: [],
    unreadableVaults: 0,
  },
  checkedAt: "2026-09-13T12:00:00Z",
  redacted: false,
};
async function fixture(page: Page) {
  await page.clock.install({ time: new Date("2026-09-13T12:00:00Z") });
  await page.addInitScript(() => {
    const calls: string[] = [];
    const copied: string[] = [];
    // The sandboxed test origin has no clipboard permission; record instead.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          copied.push(text);
          return Promise.resolve();
        },
      },
    });
    Object.assign(window, {
      __copied: copied,
      __walletCalls: calls,
      ethereum: {
        isMetaMask: true,
        on: () => {},
        removeListener: () => {},
        request: ({ method }: { method: string }) => {
          calls.push(method);
          return Promise.reject(new Error("fixture wallet"));
        },
      },
    });
  });
  await page.route("**/api/organizations/*/ai/template-draft", (route) =>
    route.fulfill({ json: templateResponse }),
  );
  await page.route("**/api/organizations/*/grants/*/ai/review", (route) =>
    route.fulfill({ json: reviewResponse }),
  );
  await page.route("**/api/organizations/*/ai/report", (route) =>
    route.fulfill({ json: reportResponse }),
  );
  await page.goto("/visual/ai-tools", { waitUntil: "domcontentloaded" });
  await expect(
    page.locator("section").first().getByRole("button"),
  ).toBeEnabled();
}
async function noWalletWrites(page: Page) {
  const calls = await page.evaluate(
    () => (window as unknown as { __walletCalls: string[] }).__walletCalls,
  );
  expect(
    calls.filter((method) =>
      /sendTransaction|sign|wallet_sendCalls/i.test(method),
    ),
  ).toEqual([]);
}

test("HAS-19 generates, applies, edits, explicitly saves and reuses a template without wallet writes", async ({
  page,
}) => {
  await fixture(page);
  const saved: unknown[] = [];
  await page.route("**/api/organizations/*/templates", (route) => {
    const input = route.request().postDataJSON();
    saved.push(input);
    return route.fulfill({
      json: {
        template: {
          ...input,
          id: "aaaaaaaa-0000-4000-8000-000000000002",
          version: 1,
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "Generate a template with AI" })
    .click();
  await page
    .getByLabel("What should this template describe?")
    .fill("A reusable milestone grant for a release");
  await page.getByRole("button", { name: "Draft it", exact: true }).click();
  await expect(
    page.getByText("Release template", { exact: true }),
  ).toBeVisible();
  expect(saved).toHaveLength(0);
  await page.getByRole("button", { name: "Apply to the editor" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Release template",
  );
  await page
    .getByLabel("Name", { exact: true })
    .fill("Owner reviewed template");
  expect(saved).toHaveLength(0);
  await page
    .getByRole("button", { name: "Save template", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply to the wizard" }),
  ).toBeVisible();
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    name: "Owner reviewed template",
    defaultReviewerMemberId: null,
  });
  await page.getByRole("button", { name: "Apply to the wizard" }).click();
  await expect(page.getByLabel("Grant title")).toHaveValue(
    "Owner reviewed template",
  );
  await noWalletWrites(page);
});

test("HAS-19 preserves edits when replacement is declined and supports manual creation after failure", async ({
  page,
}) => {
  await fixture(page);
  await page.getByLabel("Name", { exact: true }).fill("Keep my edits");
  await page
    .getByRole("button", { name: "Generate a template with AI" })
    .click();
  await page
    .getByLabel("What should this template describe?")
    .fill("A reusable release template");
  await page.getByRole("button", { name: "Draft it", exact: true }).click();
  await page.getByRole("button", { name: "Apply to the editor" }).click();
  const replaceConfirm = page
    .getByRole("alert")
    .filter({ hasText: "Your edits will be replaced" });
  await expect(replaceConfirm).toBeVisible();
  await replaceConfirm.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Keep my edits",
  );
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.route("**/api/organizations/*/ai/template-draft", (route) =>
    route.fulfill({ json: { draft: null, unavailable: true } }),
  );
  await page.getByRole("button", { name: "Draft it", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Continue with the template editor",
  );
  await expect(page.getByLabel("Name", { exact: true })).toBeEditable();
});

test("HAS-17 cites sources, marks changed context and discards results on session changes", async ({
  page,
}) => {
  await fixture(page);
  await page
    .getByRole("button", { name: "Evidence analysis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Analyze evidence", exact: true })
    .click();
  await expect(
    page.getByText("Non-binding recommendation", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: "Evidence for milestone 1", exact: true })
      .last(),
  ).toHaveAttribute("href", "https://example.org/evidence");
  await page.getByRole("button", { name: "Fixture: change evidence" }).click();
  await expect(page.getByRole("status")).toContainText("context has changed");
  await expect(
    page.getByText("Non-binding recommendation", { exact: true }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Analyze evidence", exact: true })
    .click();
  await expect(
    page.getByText("Non-binding recommendation", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fixture: change session" }).click();
  await expect(
    page.getByText("The release milestone is pending."),
  ).toBeHidden();
  await noWalletWrites(page);
});

test("HAS-17 keeps manual review usable on provider failure and handles keyboard collapse", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/organizations/*/grants/*/ai/review", (route) =>
    route.fulfill({
      json: { ...reviewResponse, review: null, missingNotes: true },
    }),
  );
  await page
    .getByRole("button", { name: "Evidence analysis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Analyze evidence", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Manual review and approval remain available",
  );
  await page
    .getByRole("button", { name: "Analyze evidence", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Evidence analysis", exact: true }),
  ).toBeFocused();
  await noWalletWrites(page);
});

test("HAS-17 exports a cited analysis and jumps from a note to its milestone", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("button", { name: "Evidence analysis" }).click();
  await page.getByRole("button", { name: "Analyze evidence" }).click();
  await expect(
    page.getByText("The release milestone is pending."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Go to milestone 1" }).click();
  await expect(page.locator("#milestone-0")).toBeVisible();
  await page.getByRole("button", { name: "Copy as a report" }).click();
  const copied = await page.evaluate(
    () => (window as unknown as { __copied: string[] }).__copied,
  );
  expect(copied).toHaveLength(1);
  // The export has to carry the citations and the caveat, not just the prose.
  expect(copied[0]).toContain("The note reports failing tests.");
  expect(copied[0]).toContain("Evidence for milestone 1");
  expect(copied[0]).toContain("not downloaded or verified");
  expect(copied[0]).toContain("Advisory only");
  await noWalletWrites(page);
});

test("HAS-17 summarizes the organization report and regenerates when it goes stale", async ({
  page,
}) => {
  const reportRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/ai/report"))
      reportRequests.push(request.url());
  });
  await fixture(page);
  await page.getByRole("button", { name: "Read this report with AI" }).click();
  await page.getByRole("button", { name: "Summarize this report" }).click();
  await expect(page.getByText("One grant is active.")).toBeVisible();
  // Citations point at the page's own sections, not at anything the model wrote.
  await expect(
    page.getByRole("link", { name: "Grant lifecycle counts" }).first(),
  ).toHaveAttribute("href", "#report-lifecycle");
  await page.clock.fastForward("06:00");
  const staleNotice = page
    .getByRole("status")
    .filter({ hasText: "over five minutes old" });
  await expect(staleNotice).toBeVisible();
  await staleNotice.getByRole("button", { name: "Generate it again" }).click();
  await expect(page.getByText("One grant is active.")).toBeVisible();
  expect(reportRequests).toHaveLength(2);
  await noWalletWrites(page);
});

for (const locale of ["en", "es", "zh-CN"] as const) {
  for (const width of [390, 1440]) {
    test(`both tools are readable in ${locale} at ${width}px`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        {
          name: "hashvest_locale",
          value: locale,
          domain: "127.0.0.1",
          path: "/",
        },
      ]);
      await page.setViewportSize({ width, height: 900 });
      await fixture(page);
      const names = {
        en: [
          "Generate a template with AI",
          "Draft it",
          "Evidence analysis",
          "Analyze evidence",
        ],
        es: [
          "Generar plantilla con IA",
          "Redactar",
          "Análisis de evidencia",
          "Analizar evidencia",
        ],
        "zh-CN": ["使用 AI 生成模板", "生成草稿", "证据分析", "分析证据"],
      }[locale];
      await page.getByRole("button", { name: names[0], exact: true }).click();
      await page
        .getByRole("region")
        .locator("textarea")
        .fill("A reusable release grant with two milestones");
      await page.getByRole("button", { name: names[1], exact: true }).click();
      await expect(
        page.getByText("Release template", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: names[0], exact: true }),
      ).toHaveScreenshot(`template-${locale}-${width}.png`, {
        animations: "disabled",
      });
      await page.getByRole("button", { name: names[2], exact: true }).click();
      await page.getByRole("button", { name: names[3], exact: true }).click();
      await expect(
        page.getByText("The release milestone is pending."),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: names[2], exact: true }),
      ).toHaveScreenshot(`review-${locale}-${width}.png`, {
        animations: "disabled",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await noWalletWrites(page);
    });
  }
}
