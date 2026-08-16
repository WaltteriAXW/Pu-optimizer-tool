import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'list' : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* The built output is what deploys, so that is what gets tested. The base path
       matches vite.config.ts's `base`, without which every asset 404s. */
    baseURL: 'http://localhost:4173/Pu-optimizer-tool/',
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* CI installs its own browser and needs no override. Sandboxed environments often
           ship a Chromium whose build number does not match this Playwright release; point
           PLAYWRIGHT_CHROMIUM_EXECUTABLE at it to run the suite there. */
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },

  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/Pu-optimizer-tool/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
