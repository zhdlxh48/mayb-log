import { execFileSync } from 'node:child_process';
import { expect, request as createRequest, test } from '@playwright/test';

const username = 'smoke_user';
const email = 'smoke_user@example.com';
const password = 'Smoke-password-123!';
const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
	'base64'
);

function sql(command: string) {
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

test.beforeAll(async ({ request }) => {
	sql(`DELETE FROM posts WHERE author_id IN (SELECT id FROM user WHERE username = '${username}');`);
	sql(`DELETE FROM user WHERE username = '${username}';`);
	const response = await request.post('/signup', {
		headers: { origin: 'http://localhost:5173' },
		form: {
			username,
			name: 'Smoke User',
			email,
			password,
			passwordConfirmation: password,
			captcha: 'test-token'
		}
	});
	expect(response.ok(), `${response.status()} ${await response.text()}`).toBe(true);
	const denied = await request.post('/api/auth/sign-in/username', {
		headers: { 'x-captcha-response': 'test-token', origin: 'http://localhost:5173' },
		data: { username, password }
	});
	expect(denied.status()).toBe(403);
	sql(`UPDATE user SET approved = 1 WHERE username = '${username}';`);
});

test.afterAll(() => {
	sql(`DELETE FROM posts WHERE author_id IN (SELECT id FROM user WHERE username = '${username}');`);
	sql(`DELETE FROM user WHERE username = '${username}';`);
});

test('rejects a protected mutation without a session', async () => {
	const context = await createRequest.newContext({ baseURL: 'http://localhost:5173' });
	const response = await context.post('/posts/new?/saveDraft', {
		maxRedirects: 0,
		headers: { origin: 'http://localhost:5173' },
		form: {}
	});
	const denied = (await response.json()) as { type: string; status: number; location: string };
	expect(denied).toMatchObject({ type: 'redirect', status: 303 });
	expect(denied.location).toContain('/login?next=');
	await context.dispose();
});

test('auth, editor, media, preview and post lifecycle', async ({ page, context }) => {
	await context.addCookies([
		{ name: 'PARAGLIDE_LOCALE', value: 'en', domain: 'localhost', path: '/' }
	]);
	await page.goto('/login');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.getByRole('link', { name: 'Sign up' }).click();
	await expect(page).toHaveURL('/signup');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.goBack();
	await expect(page).toHaveURL('/login');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.goForward();
	await expect(page).toHaveURL('/signup');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	const otherTab = await context.newPage();
	await otherTab.goto('about:blank');
	await page.bringToFront();
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await otherTab.close();

	await page.goto('/login?next=/posts/new');
	await page.getByLabel('User ID').fill(username);
	await page.getByLabel('Password', { exact: true }).fill(password);
	await expect(page.locator('input[name="captcha"]')).toHaveValue(/.+/);
	await page.getByRole('button', { name: 'Login' }).click();
	await expect(page).toHaveURL('/posts/new');
	const assetId = await page.locator('input[name="assetId"]').inputValue();
	expect(assetId).toMatch(/^[0-9a-f-]{36}$/);
	await page.getByLabel('Title', { exact: true }).fill('SvelteKit smoke post');
	await page.getByLabel('Description').fill('Post lifecycle smoke test.');
	await page.getByLabel('Body').fill('# Smoke\n\nPreview body');
	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'smoke.png', mimeType: 'image/png', buffer: png });
	const imageLink = page.locator('table.images a');
	await expect(imageLink).toBeVisible();
	const mediaUrl = await imageLink.getAttribute('href');
	expect(mediaUrl).toMatch(new RegExp(`^/media/${assetId}/[0-9a-f-]{36}\\.webp$`));
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(mediaUrl!));
	await page.getByRole('button', { name: 'Preview' }).click();
	await expect(page.locator('.preview h1')).toHaveText('Smoke');
	const invalidFields = await page.locator('form').evaluate((form: HTMLFormElement) =>
		Array.from(form.elements)
			.filter((field) => 'checkValidity' in field && !(field as HTMLInputElement).checkValidity())
			.map((field) => (field as HTMLInputElement).name)
	);
	expect(invalidFields).toEqual([]);
	const saveResponse = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	const saved = await saveResponse;
	expect(saved.status()).toBe(303);
	await expect(page).toHaveURL(/\/posts\/\d+\/edit\?saved=1$/);
	const editUrl = page.url();
	const postId = editUrl.match(/\/posts\/(\d+)\/edit/)?.[1];
	expect(postId).toBeTruthy();

	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page).toHaveURL(`/posts/${postId}`);
	await expect(page.getByRole('heading', { name: 'SvelteKit smoke post' })).toBeVisible();
	await expect(page.locator('.article-body img')).toHaveAttribute('src', mediaUrl!);
	await page.getByRole('link', { name: 'Smoke User' }).click();
	await expect(page).toHaveURL('/search?author=smoke_user');
	await expect(page.getByRole('link', { name: 'SvelteKit smoke post' })).toBeVisible();

	await page.goto(editUrl);
	await page.getByLabel('Title', { exact: true }).fill('Edited smoke post');
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByRole('heading', { name: 'Edited smoke post' })).toBeVisible();
	await page.getByRole('link', { name: 'Edit' }).click();
	page.once('dialog', (dialog) => dialog.accept());
	await page.locator('button[formaction="?/delete"]').click();
	await expect(page).toHaveURL('/posts');

	const imageId = mediaUrl!.split('/').at(-1)!.replace('.webp', '');
	const removed = await page.evaluate(
		async ({ assetId, imageId }) =>
			fetch(`/api/media/${assetId}/${imageId}`, { method: 'DELETE' }).then(
				(response) => response.status
			),
		{ assetId, imageId }
	);
	expect(removed).toBe(204);
});
