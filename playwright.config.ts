import { defineConfig } from "@playwright/test";
import { browserOptions } from "./tests/browser";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5174",
    launchOptions: await browserOptions(),
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: "https://journey-fixture.supabase.co",
      VITE_SUPABASE_ANON_KEY: "sb_publishable_fixture",
    },
  },
});
