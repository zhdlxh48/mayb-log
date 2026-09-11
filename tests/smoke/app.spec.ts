import { execFileSync } from 'node:child_process';
import { expect, request as createRequest, test, type APIResponse } from '@playwright/test';

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

function query<T>(command: string) {
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

function postData(overrides: Record<string, string> = {}, categories: number[] = []) {
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

async function actionStatus(response: APIResponse) {
	if (response.status() !== 200) return response.status();
	const result = (await response.json()) as { status?: number };
	return result.status ?? response.status();
}

test.beforeAll(async ({ request }) => {
	sql(`DELETE FROM posts WHERE author_id IN (SELECT id FROM user WHERE username = '${username}');`);
	sql(`DELETE FROM user WHERE username = '${username}';`);
	sql(`DELETE FROM categories WHERE name = 'Smoke category';`);
	sql(`DELETE FROM series WHERE title = 'Smoke series';`);
	sql(`INSERT INTO categories (name, description) VALUES ('Smoke category', 'fixture');`);
	sql(`INSERT INTO series (title, description) VALUES ('Smoke series', 'fixture');`);
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
	sql(`DELETE FROM categories WHERE name = 'Smoke category';`);
	sql(`DELETE FROM series WHERE title = 'Smoke series';`);
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
	const page = await context.get('/posts/new', { maxRedirects: 0 });
	expect(page.status()).toBe(303);
	expect(page.headers().location).toContain('/login?next=');
	await context.dispose();
});

test('rejects oversized and invalid public search filters', async ({ request }) => {
	expect((await request.get(`/search?q=${'a'.repeat(201)}`)).status()).toBe(400);
	expect((await request.get('/search?from=2026-02-30')).status()).toBe(400);
});

test('auth, editor, media, preview and post lifecycle', async ({ page, context }) => {
	const cspErrors: string[] = [];
	page.on('console', (message) => {
		if (/content security policy|refused to apply.*style/i.test(message.text()))
			cspErrors.push(message.text());
	});
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
	await page.getByLabel('Description').fill('Post lifecycle smoke test.');
	await page.getByLabel('Tags').fill('original-tag');
	await page.getByLabel('Smoke category').check();
	await page.getByLabel('Body').fill('# Smoke\n\nPreview body');
	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'smoke.png', mimeType: 'image/png', buffer: png });
	const imageLink = page.locator('table.images a');
	await expect(imageLink).toBeVisible();
	const mediaUrl = await imageLink.getAttribute('href');
	expect(mediaUrl).toMatch(new RegExp(`^/media/${assetId}/[0-9a-f-]{36}\\.webp$`));
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(mediaUrl!));
	await page
		.getByLabel('Title', { exact: true })
		.evaluate((input) => input.removeAttribute('required'));
	const invalidResponse = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await invalidResponse).status()).toBe(400);
	await expect(page).toHaveURL(/\/posts\/new\?\/saveDraft$/);
	await expect(page.locator('input[name="assetId"]')).toHaveValue(assetId);
	await expect(page.locator('table.images a')).toHaveAttribute('href', mediaUrl!);
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(mediaUrl!));
	await expect(page.getByLabel('Tags')).toHaveValue('original-tag');
	await expect(page.getByLabel('Smoke category')).toBeChecked();
	await page.getByLabel('Title', { exact: true }).fill('SvelteKit smoke post');

	const invalidDateAssetId = crypto.randomUUID();
	const invalidDate = await context.request.post('/posts/new?/publish', {
		headers: {
			origin: 'http://localhost:5173',
			'content-type': 'application/x-www-form-urlencoded'
		},
		data: postData({
			assetId: invalidDateAssetId,
			title: 'Invalid date post',
			publishedAt: '2026-02-30T12:00'
		})
	});
	expect(await actionStatus(invalidDate)).toBe(400);
	expect(
		query<{ value: number }>(
			`SELECT count(*) AS value FROM posts WHERE asset_id = '${invalidDateAssetId}'`
		)[0].value
	).toBe(0);

	const missingId = 2147483647;
	const categoryId = query<{ id: number }>(
		`SELECT id FROM categories WHERE name = 'Smoke category'`
	)[0].id;
	for (const [name, categories, tags] of [
		['none', [], ''],
		['category', [categoryId], ''],
		['tag', [], 'missing-post-tag']
	] as const) {
		const response = await context.request.post(`/posts/${missingId}/edit?/saveDraft`, {
			headers: {
				origin: 'http://localhost:5173',
				'content-type': 'application/x-www-form-urlencoded'
			},
			data: postData({ title: `Missing ${name}`, tags }, [...categories])
		});
		expect(await actionStatus(response), name).toBe(404);
	}
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
	await expect(page.locator('table.images a')).toHaveAttribute('href', mediaUrl!);
	await expect(page.getByLabel('Tags')).toHaveValue('original-tag');
	await expect(page.getByLabel('Smoke category')).toBeChecked();
	const editUrl = page.url();
	const postId = editUrl.match(/\/posts\/(\d+)\/edit/)?.[1];
	expect(postId).toBeTruthy();

	const seriesId = query<{ id: number }>(`SELECT id FROM series WHERE title = 'Smoke series'`)[0]
		.id;
	const blockerAssetId = crypto.randomUUID();
	sql(`INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
		SELECT '${blockerAssetId}', id, 'Series blocker', 'fixture', 'fixture', ${seriesId}, 1, 0, NULL, 1, 1
		FROM user WHERE username = '${username}';`);
	const conflict = await context.request.post(`/posts/${postId}/edit?/saveDraft`, {
		headers: {
			origin: 'http://localhost:5173',
			'content-type': 'application/x-www-form-urlencoded'
		},
		data: postData(
			{
				title: 'Partially changed',
				seriesId: String(seriesId),
				seriesPosition: '1',
				tags: 'should-not-save'
			},
			[categoryId]
		)
	});
	expect(await actionStatus(conflict)).toBe(409);
	expect(query<{ title: string }>(`SELECT title FROM posts WHERE id = ${postId}`)[0].title).toBe(
		'SvelteKit smoke post'
	);
	expect(
		query<{ value: number }>(
			`SELECT count(*) AS value FROM post_categories WHERE post_id = ${postId}`
		)[0].value
	).toBe(1);
	expect(query<{ tag: string }>(`SELECT tag FROM post_tags WHERE post_id = ${postId}`)).toEqual([
		{ tag: 'original-tag' }
	]);

	const createConflictAssetId = crypto.randomUUID();
	const createConflict = await context.request.post('/posts/new?/saveDraft', {
		headers: {
			origin: 'http://localhost:5173',
			'content-type': 'application/x-www-form-urlencoded'
		},
		data: postData(
			{
				assetId: createConflictAssetId,
				title: 'Create conflict',
				seriesId: String(seriesId),
				seriesPosition: '1',
				tags: 'should-not-save'
			},
			[categoryId]
		)
	});
	expect(await actionStatus(createConflict)).toBe(409);
	expect(
		query<{ value: number }>(
			`SELECT count(*) AS value FROM posts WHERE asset_id = '${createConflictAssetId}'`
		)[0].value
	).toBe(0);

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
	for (const path of ['/', '/posts', '/search', '/archive', '/series', '/categories']) {
		await page.goto(path);
		await expect(page.locator('main')).toBeVisible();
	}
	expect(cspErrors).toEqual([]);

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
