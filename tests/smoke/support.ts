import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { Pool, type QueryResultRow } from 'pg';

const pool = new Pool({
	host: '127.0.0.1',
	port: 5432,
	database: 'mayb_log_test',
	user: 'mayb_log_test',
	password: 'mayb-log-test-password'
});

export const password = 'Smoke-password-123!';
export const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
	'base64'
);

export async function sql(command: string, values: unknown[] = []) {
	await pool.query(command, values);
}

export async function query<T extends QueryResultRow>(command: string, values: unknown[] = []) {
	return (await pool.query<T>(command, values)).rows;
}

export async function cleanupUser(username: string) {
	await sql('DELETE FROM posts WHERE author_id IN (SELECT id FROM "user" WHERE username = $1)', [
		username
	]);
	await sql('DELETE FROM "user" WHERE username = $1', [username]);
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

export async function approveUser(username: string) {
	await sql('UPDATE "user" SET approved = true WHERE username = $1', [username]);
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
