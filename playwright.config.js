import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8792" },
  webServer: {
    command:
      "pnpm exec wrangler dev --local --port 8792 --var TURNSTILE_SECRET_KEY:1x0000000000000000000000000000000AA --var TURNSTILE_SITE_KEY:1x00000000000000000000AA",
    url: "http://127.0.0.1:8792",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
