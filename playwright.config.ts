import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], channel: "chromium" },
    },
    {
      name: "mobile-webkit",
      testMatch: "**/compatibility.spec.ts",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
    {
      name: "mobile-firefox",
      testMatch: "**/compatibility.spec.ts",
      use: { browserName: "firefox", viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
