import { defineConfig, devices } from '@playwright/test'

/**
 * Phase 2.10: API auth checks. Requires `.env.local` (Clerk + Supabase) the same as `npm run dev`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120_000,
  },
})
