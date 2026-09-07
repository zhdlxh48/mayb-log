import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.TEST_URL ?? 'http://127.0.0.1:4323/mayb-log/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: process.env.TEST_URL
    ? undefined
    : {
        command: 'pnpm preview --host 127.0.0.1 --port 4323',
        env: { ASTRO_PREVIEW_BACKGROUND: '1' },
        url: 'http://127.0.0.1:4323/mayb-log/',
        reuseExistingServer: !process.env.CI,
      },
});
