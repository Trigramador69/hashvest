import { defineConfig } from "@playwright/test";

const port = process.env.HASHVEST_VISUAL_PORT || "3100";
const baseURL = `http://127.0.0.1:${port}`;

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
    baseURL,
    colorScheme: "dark",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/visual-server.mjs",
    env: { VISUAL_TEST_MODE: "1", HASHVEST_VISUAL_PORT: port },
    url: baseURL,
    // Never test another worktree's server just because it owns the default port.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
