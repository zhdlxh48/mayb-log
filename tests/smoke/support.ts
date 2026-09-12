import { execFileSync } from 'node:child_process';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const password = 'Smoke-password-123!';
export const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
	'base64'
);

export function sql(command: string) {
	execFileSync(
		process.execPath,
		[
			'node_modules/wrangler/bin/wrangler.js',
			'd1',
			'execute',
			'DB',
			'--local',
			'--command',
			command
		],
		{ stdio: 'ignore' }
	);
}

export function query<T>(command: string) {
	const output = execFileSync(
		process.execPath,
		[
			'node_modules/wrangler/bin/wrangler.js',
			'd1',
			'execute',
			'DB',
			'--local',
			'--command',
			command,
			'--json'
		],
		{ encoding: 'utf8' }
	);
	return (JSON.parse(output) as [{ results: T[] }])[0].results;
}

export function cleanupUser(username: string) {
	sql(`DELETE FROM posts WHERE author_id IN (SELECT id FROM user WHERE username = '${username}');`);
	sql(`DELETE FROM user WHERE username = '${username}';`);
}

export async function signup(request: APIRequestContext, username: string, name: string) {
	return request.post('/signup', {
		headers: { origin: 'http://localhost:5173' },
		form: {
			username,
			name,
			email: `${username}@example.com`,
			password,
			passwordConfirmation: password,
			captcha: 'test-token'
		}
	});
}

export function approveUser(username: string) {
	sql(`UPDATE user SET approved = 1 WHERE username = '${username}';`);
}

export async function login(page: Page, username: string, next = '/posts/new') {
	await page
		.context()
		.addCookies([{ name: 'PARAGLIDE_LOCALE', value: 'en', domain: 'localhost', path: '/' }]);
	await page.goto(`/login?next=${encodeURIComponent(next)}`);
	await page.getByLabel('User ID').fill(username);
	await page.getByLabel('Password', { exact: true }).fill(password);
	await expect(page.locator('input[name="captcha"]')).toHaveValue(/.+/);
	await page.getByRole('button', { name: 'Login' }).click();
}

export function postData(overrides: Record<string, string> = {}, categories: number[] = []) {
	const data = new URLSearchParams({
		title: 'Request post',
		subtitle: '',
		description: 'Request description',
		bodyMarkdown: 'Request body',
		seriesId: '',
		seriesPosition: '',
		tags: '',
		publishedAt: '',
		...overrides
	});
	categories.forEach((id) => data.append('categories', String(id)));
	return data.toString();
}

export async function actionStatus(response: { status(): number; json(): Promise<unknown> }) {
	if (response.status() !== 200) return response.status();
	const result = (await response.json()) as { status?: number };
	return result.status ?? response.status();
}
