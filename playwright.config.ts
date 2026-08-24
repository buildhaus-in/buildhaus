import { defineConfig, devices } from "@playwright/test";

// e2e smoke tests against the two Next.js dev servers, which are already
// running as background processes this config does not manage (no
// `webServer` entry — starting/stopping them is out of scope here; see
// README / `npm run dev`). Two projects give each spec file's tests a fixed
// baseURL: apps/website on :3000, apps/portal on :3001.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "website",
      testMatch: /website\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "portal",
      testMatch: /portal\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
    },
  ],
});
