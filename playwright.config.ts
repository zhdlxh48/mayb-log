import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/smoke',
	workers: 1,
	webServer: {
		command: 'docker compose -f compose.test.yaml up --build',
		port: 5173,
		reuseExistingServer: false,
		timeout: 180_000
	},
	use: { baseURL: 'http://localhost:5173' },
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
