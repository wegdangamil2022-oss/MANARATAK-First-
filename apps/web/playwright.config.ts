import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'html',
  use: {
    baseURL: "http://localhost:3000",
    trace: 'on-first-retry',
  },
  
  webServer: {
    command: "npm run dev -w @manaratak/web",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_USE_INSTALLED_CHROME === 'true' ? { channel: 'chrome' } : {}),
      },
    },
  ],
});
