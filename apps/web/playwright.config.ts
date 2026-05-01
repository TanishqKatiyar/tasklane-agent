import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start both API and Web servers before tests
  // Requires Docker Postgres + Redis to be running
  webServer: [
    {
      command: 'pnpm --filter @tasklane/api dev',
      port: 4000,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      cwd: '../../',
    },
    {
      command: 'pnpm --filter @tasklane/web dev',
      port: 3000,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      cwd: '../../',
    },
  ],
});
