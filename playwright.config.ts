import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/smoke',
	workers: 1,
	webServer: {
		command: 'pnpm db:migrate:local && pnpm build && pnpm preview',
		port: 5173,
		reuseExistingServer: !process.env.CI
	},
	use: { baseURL: 'http://localhost:5173' },
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
