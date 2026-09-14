import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  timeout: 90_000,
  expect: { timeout: 20_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // Chromium-only launch flags: CI runners have no GPU, and SwiftShader
  // renders the same image, slowly — enough to catch a scene that has
  // stopped drawing at all. WebKit doesn't take these arguments, so they
  // live on the two Chromium projects rather than globally.
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: { args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        launchOptions: { args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
      },
    },
    // The one engine the rest of the suite never touches: no Chromium
    // flags, and the properties this site leans on hardest —
    // `-webkit-text-stroke`, `mask-composite`, `backdrop-filter`,
    // `writing-mode` — are exactly the ones with the longest history of
    // engine-specific quirks.
    { name: "safari", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
  ],

  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
