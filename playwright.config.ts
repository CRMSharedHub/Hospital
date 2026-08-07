import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    locale: 'en-US',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // build:e2e loads .env.e2e (VITE_ALLOW_DEMO_AUTH + VITE_DISABLE_MFA) into the bundle
    command: 'npm run build:e2e && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    // Never reuse a stale preview that was built without e2e flags
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
