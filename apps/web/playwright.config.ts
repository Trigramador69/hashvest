import { defineConfig } from "@playwright/test";

/**
 * Visual contract for the public landing and the responsive dashboard shell.
 * The server is intentionally started in test mode so the guarded fixture
 * route can render deterministic onchain-shaped data without touching HSK.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  snapshotDir: "./tests/__screenshots",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    colorScheme: "dark",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/visual-server.mjs",
    env: { VISUAL_TEST_MODE: "1" },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
