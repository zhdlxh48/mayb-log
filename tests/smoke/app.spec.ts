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
	sql(
		`DELETE FROM categories WHERE name IN ('Smoke category', 'Stale new category', 'Stale post category', 'Stale edit category', 'Invalid route category');`
	);
	sql(
		`DELETE FROM series WHERE title IN ('Smoke series', 'Stale post series', 'Stale edit series', 'Stale delete series', 'Invalid route series');`
	);
	sql(`INSERT INTO categories (name, description) VALUES
		('Smoke category', 'fixture'),
		('Stale new category', 'fixture'),
		('Stale post category', 'fixture'),
		('Stale edit category', 'fixture');`);
	sql(`INSERT INTO series (title, description) VALUES
		('Smoke series', 'fixture'),
		('Stale post series', 'fixture'),
		('Stale edit series', 'fixture'),
		('Stale delete series', 'fixture');`);
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
	sql(
		`DELETE FROM categories WHERE name IN ('Smoke category', 'Stale new category', 'Stale post category', 'Stale edit category', 'Invalid route category');`
	);
	sql(
		`DELETE FROM series WHERE title IN ('Smoke series', 'Stale post series', 'Stale edit series', 'Stale delete series', 'Invalid route series');`
	);
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
	for (const path of ['/posts?page=999999', '/search?page=999999']) {
		const response = await request.get(path, { maxRedirects: 0 });
		expect(response.status(), path).toBe(303);
	}
});

test('auth, editor, media, preview and post lifecycle', async ({ page, context }) => {
	test.setTimeout(60_000);
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
	await page.getByLabel('Stale new category').check();
	await page.getByLabel('Body').fill('# Smoke\n\nPreview body');
	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'smoke.png', mimeType: 'image/png', buffer: png });
	const primaryImageItem = page.locator('.image-item').first();
	await expect(page.locator('.image-grid')).toBeVisible();
	await expect(primaryImageItem.getByRole('checkbox')).toBeVisible();
	await expect(primaryImageItem.getByRole('button', { name: /^Insert / })).toBeVisible();
	await expect(primaryImageItem.getByRole('button', { name: /Delete/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Delete selected (0)' })).toBeDisabled();
	const mediaUrl = await primaryImageItem.locator('img').getAttribute('src');
	expect(mediaUrl).toMatch(new RegExp(`^/media/${assetId}/[0-9a-f-]{36}\\.webp$`));
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(mediaUrl!));
	const beforeInsert = await page.getByLabel('Body').inputValue();
	await primaryImageItem.getByRole('button', { name: /^Insert / }).click();
	await expect(page.getByLabel('Body')).toHaveValue(`${beforeInsert}![image](${mediaUrl})`);

	const invalidBatchDelete = await context.request.delete(`/api/media/${assetId}`, {
		headers: { origin: 'http://localhost:5173' },
		data: { imageIds: ['not-a-uuid'] }
	});
	expect(invalidBatchDelete.status()).toBe(400);
	const oversizedBatchDelete = await context.request.delete(`/api/media/${assetId}`, {
		headers: { origin: 'http://localhost:5173' },
		data: { imageIds: Array.from({ length: 21 }, () => crypto.randomUUID()) }
	});
	expect(oversizedBatchDelete.status()).toBe(400);

	for (let index = 0; index < 2; index += 1) {
		await page
			.getByLabel('Upload image')
			.setInputFiles({ name: `delete-${index}.png`, mimeType: 'image/png', buffer: png });
		await expect(page.locator('.image-item')).toHaveCount(index + 2);
	}
	const disposableUrls = await page
		.locator('.image-item img')
		.evaluateAll((images) => images.slice(1).map((image) => image.getAttribute('src')!));
	const disposableIds = disposableUrls.map((url) => url.split('/').at(-1)!.replace('.webp', ''));
	for (const id of disposableIds)
		await page.locator(`[data-image-id="${id}"]`).getByRole('checkbox').check();
	await expect(page.getByRole('button', { name: 'Delete selected (2)' })).toBeEnabled();
	const batchRequests: { imageIds: string[] }[] = [];
	page.on('request', (request) => {
		if (
			request.method() === 'DELETE' &&
			new URL(request.url()).pathname === `/api/media/${assetId}`
		)
			batchRequests.push(request.postDataJSON() as { imageIds: string[] });
	});
	let deleteDialogs = 0;
	page.once('dialog', async (dialog) => {
		deleteDialogs += 1;
		await dialog.accept();
	});
	const multiDeleteResponse = page.waitForResponse(
		(response) =>
			response.request().method() === 'DELETE' &&
			new URL(response.url()).pathname === `/api/media/${assetId}`
	);
	await page.getByRole('button', { name: 'Delete selected (2)' }).click();
	expect((await multiDeleteResponse).status()).toBe(204);
	expect(batchRequests).toEqual([{ imageIds: disposableIds }]);
	expect(deleteDialogs).toBe(1);
	await expect(page.locator('.image-item')).toHaveCount(1);
	await expect(page.locator(`.image-item img[src="${mediaUrl}"]`)).toBeVisible();
	for (const url of disposableUrls)
		await expect(page.getByLabel('Body')).toHaveValue(new RegExp(url));

	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'delete-one.png', mimeType: 'image/png', buffer: png });
	await expect(page.locator('.image-item')).toHaveCount(2);
	const singleDeleteItem = page.locator('.image-item').nth(1);
	const singleDeleteUrl = await singleDeleteItem.locator('img').getAttribute('src');
	const singleDeleteId = singleDeleteUrl!.split('/').at(-1)!.replace('.webp', '');
	await singleDeleteItem.getByRole('checkbox').check();
	const batchUrl = `**/api/media/${assetId}`;
	let markFailedDeleteStarted = () => {};
	const failedDeleteStarted = new Promise<void>((resolve) => (markFailedDeleteStarted = resolve));
	let releaseFailedDelete = () => {};
	const releaseFailedDeleteRequest = new Promise<void>(
		(resolve) => (releaseFailedDelete = resolve)
	);
	await page.route(batchUrl, async (route) => {
		markFailedDeleteStarted();
		await releaseFailedDeleteRequest;
		await route.fulfill({ status: 500 });
	});
	page.once('dialog', async (dialog) => {
		deleteDialogs += 1;
		await dialog.accept();
	});
	const failedDeleteResponse = page.waitForResponse(
		(response) =>
			response.request().method() === 'DELETE' &&
			new URL(response.url()).pathname === `/api/media/${assetId}`
	);
	await page.getByRole('button', { name: 'Delete selected (1)' }).click();
	await failedDeleteStarted;
	await expect(page.getByRole('button', { name: 'Delete selected (1)' })).toBeDisabled();
	await expect(singleDeleteItem.getByRole('checkbox')).toBeDisabled();
	releaseFailedDelete();
	expect((await failedDeleteResponse).status()).toBe(500);
	await page.unroute(batchUrl);
	await expect(page.getByRole('alert')).toHaveText('Could not delete the image.');
	await expect(singleDeleteItem).toBeVisible();
	await expect(singleDeleteItem.getByRole('checkbox')).toBeChecked();
	await expect(page.getByRole('button', { name: 'Delete selected (1)' })).toBeEnabled();

	await page.route(batchUrl, (route) => route.abort());
	page.once('dialog', async (dialog) => {
		deleteDialogs += 1;
		await dialog.accept();
	});
	const abortedDeleteRequest = page.waitForRequest(
		(request) =>
			request.method() === 'DELETE' && new URL(request.url()).pathname === `/api/media/${assetId}`
	);
	await page.getByRole('button', { name: 'Delete selected (1)' }).click();
	await abortedDeleteRequest;
	await page.unroute(batchUrl);
	await expect(page.getByRole('alert')).toHaveText('Could not delete the image.');
	await expect(singleDeleteItem).toBeVisible();
	await expect(singleDeleteItem.getByRole('checkbox')).toBeChecked();
	await expect(page.getByRole('button', { name: 'Delete selected (1)' })).toBeEnabled();

	page.once('dialog', async (dialog) => {
		deleteDialogs += 1;
		await dialog.accept();
	});
	const singleDeleteResponse = page.waitForResponse(
		(response) =>
			response.request().method() === 'DELETE' &&
			new URL(response.url()).pathname === `/api/media/${assetId}`
	);
	await page.getByRole('button', { name: 'Delete selected (1)' }).click();
	expect((await singleDeleteResponse).status()).toBe(204);
	expect(batchRequests).toEqual([
		{ imageIds: disposableIds },
		{ imageIds: [singleDeleteId] },
		{ imageIds: [singleDeleteId] },
		{ imageIds: [singleDeleteId] }
	]);
	expect(deleteDialogs).toBe(4);
	await expect(page.locator('.image-item')).toHaveCount(1);
	await expect(page.locator(`.image-item img[src="${mediaUrl}"]`)).toBeVisible();
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(singleDeleteUrl!));

	const markdownBeforeOversizedImport = await page.getByLabel('Body').inputValue();
	await page.getByLabel('Import .md').setInputFiles({
		name: 'too-large.md',
		mimeType: 'text/markdown',
		buffer: Buffer.alloc(1024 * 1024 + 1, 'a')
	});
	await expect(page.getByRole('alert')).toHaveText('The Markdown body is too large.');
	await expect(page.getByLabel('Body')).toHaveValue(markdownBeforeOversizedImport);
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
	await expect(page.locator(`.image-item img[src="${mediaUrl}"]`)).toBeVisible();
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(mediaUrl!));
	await expect(page.getByLabel('Tags')).toHaveValue('original-tag');
	await expect(page.getByLabel('Smoke category')).toBeChecked();
	await expect(page.getByLabel('Stale new category')).toBeChecked();
	await page.getByLabel('Title', { exact: true }).fill('SvelteKit smoke post');

	const staleNewCategoryId = query<{ id: number }>(
		`SELECT id FROM categories WHERE name = 'Stale new category'`
	)[0].id;
	sql(`DELETE FROM categories WHERE id = ${staleNewCategoryId};`);
	const staleNewResponse = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleNewResponse).status()).toBe(409);
	await expect(page.getByRole('alert')).toHaveText(
		'Classification information changed. Reload the page and check.'
	);
	await expect(page.locator('input[name="assetId"]')).toHaveValue(assetId);
	await expect(page.locator(`.image-item img[src="${mediaUrl}"]`)).toBeVisible();
	await expect(page.getByLabel('Title', { exact: true })).toHaveValue('SvelteKit smoke post');
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(mediaUrl!));
	await expect(page.getByLabel('Tags')).toHaveValue('original-tag');
	await expect(page.getByLabel('Smoke category')).toBeChecked();
	expect(
		query<{ value: number }>(`SELECT count(*) AS value FROM posts WHERE asset_id = '${assetId}'`)[0]
			.value
	).toBe(0);

	const seriesId = query<{ id: number }>(`SELECT id FROM series WHERE title = 'Smoke series'`)[0]
		.id;
	const blockerAssetId = crypto.randomUUID();
	sql(`INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
		SELECT '${blockerAssetId}', id, 'Series blocker', 'fixture', 'fixture', ${seriesId}, 1, 0, NULL, 1, 1
		FROM user WHERE username = '${username}';`);
	await page.locator('#seriesId').selectOption(String(seriesId));
	await page.getByLabel('Series position').fill('1');
	const uiConflictResponse = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await uiConflictResponse).status()).toBe(409);
	await expect(page.locator('input[name="assetId"]')).toHaveValue(assetId);
	await expect(page.locator(`.image-item img[src="${mediaUrl}"]`)).toBeVisible();
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(mediaUrl!));
	await expect(page.getByLabel('Tags')).toHaveValue('original-tag');
	await expect(page.getByLabel('Smoke category')).toBeChecked();
	await page.locator('#seriesId').selectOption('');
	await page.getByLabel('Series position').fill('');

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
	const markdownWithWarnings = `# Smoke

![image](${mediaUrl})

:::note{type="banana"}
Wrong type
:::

:::future_widget{foo="bar"}
Unknown widget
:::`;
	await page.getByLabel('Body').fill(markdownWithWarnings);
	await page.getByRole('button', { name: 'Preview' }).click();
	await expect(page.locator('.preview h1')).toHaveText('Smoke');
	await expect(page.locator('.preview')).toContainText(':::note{type="banana"}');
	await expect(page.locator('.preview')).toContainText(':::future_widget{foo="bar"}');
	await expect(page.locator('.preview .article-body pre code')).toHaveCount(2);
	expect(await page.locator('.preview .article-body pre code').first().textContent()).toContain(
		':::note{type="banana"}\nWrong type\n:::'
	);
	await expect(page.getByRole('heading', { name: 'Warnings (2)' })).toBeVisible();
	await expect(page.locator('.preview-warnings li')).toHaveCount(2);
	await expect(page.locator('.preview-warnings li').first()).toContainText(
		'The `note` type must be one of: info, warning, success, error.'
	);
	await expect(page.locator('.preview-warnings li').nth(1)).toContainText(
		'Unknown directive `future_widget`.'
	);
	await expect(page.getByRole('button', { name: 'Save draft' })).toBeEnabled();
	await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();
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
	await expect(page.locator(`.image-item img[src="${mediaUrl}"]`)).toBeVisible();
	await expect(page.getByLabel('Tags')).toHaveValue('original-tag');
	await expect(page.getByLabel('Smoke category')).toBeChecked();
	const editUrl = page.url();
	const postId = editUrl.match(/\/posts\/(\d+)\/edit/)?.[1];
	expect(postId).toBeTruthy();

	const primaryImageResponse = await context.request.get(mediaUrl!);
	expect(primaryImageResponse.status()).toBe(200);
	const webp = await primaryImageResponse.body();
	const paginationImages = await Promise.all(
		Array.from({ length: 20 }, async (_, index) => {
			const response = await context.request.post(`/api/media/${assetId}`, {
				headers: { origin: 'http://localhost:5173' },
				multipart: {
					file: { name: `page-${index}.webp`, mimeType: 'image/webp', buffer: webp }
				}
			});
			expect(response.status()).toBe(201);
			return (await response.json()) as { id: string; url: string };
		})
	);
	const paginationRefresh = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await paginationRefresh).status()).toBe(303);
	await expect(page.locator('.image-item')).toHaveCount(20);
	await expect(page.getByText('Page 1 / 2')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
	const imagePageUrl = page.url();
	await page.getByLabel('Title', { exact: true }).fill('Pagination state kept');
	await page.locator('.image-item').nth(0).getByRole('checkbox').check();
	await page.locator('.image-item').nth(1).getByRole('checkbox').check();
	await expect(page.getByRole('button', { name: 'Delete selected (2)' })).toBeEnabled();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page).toHaveURL(imagePageUrl);
	await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Pagination state kept');
	await expect(page.locator('.image-item')).toHaveCount(1);
	await expect(page.getByText('Page 2 / 2')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Delete selected (0)' })).toBeDisabled();
	await expect(page.locator('.image-item input:checked')).toHaveCount(0);
	await page.getByRole('button', { name: 'Previous' }).click();
	await expect(page.locator('.image-item')).toHaveCount(20);
	await expect(page.locator('.image-item input:checked')).toHaveCount(0);

	await page.locator('.image-item').first().getByRole('checkbox').check();
	const paginationUploadResponse = page.waitForResponse(
		(response) =>
			response.request().method() === 'POST' &&
			new URL(response.url()).pathname === `/api/media/${assetId}`
	);
	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'pagination-upload.png', mimeType: 'image/png', buffer: png });
	const paginationUpload = await paginationUploadResponse;
	expect(paginationUpload.status()).toBe(201);
	const uploadedPageImage = (await paginationUpload.json()) as { id: string; url: string };
	await expect(page.getByText('Page 2 / 2')).toBeVisible();
	await expect(page.locator(`.image-item[data-image-id="${uploadedPageImage.id}"]`)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Delete selected (0)' })).toBeDisabled();
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(uploadedPageImage.url));

	const paginationCleanup = await context.request.delete(`/api/media/${assetId}`, {
		headers: { origin: 'http://localhost:5173' },
		data: { imageIds: paginationImages.map(({ id }) => id) }
	});
	expect(paginationCleanup.status()).toBe(204);
	const uploadedPageImageCleanup = await context.request.delete(`/api/media/${assetId}`, {
		headers: { origin: 'http://localhost:5173' },
		data: { imageIds: [uploadedPageImage.id] }
	});
	expect(uploadedPageImageCleanup.status()).toBe(204);
	await page.getByLabel('Title', { exact: true }).fill('SvelteKit smoke post');
	const cleanupRefresh = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await cleanupRefresh).status()).toBe(303);
	await expect(page.locator('.image-item')).toHaveCount(1);
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(uploadedPageImage.url));
	await page.getByLabel('Body').fill(markdownWithWarnings);

	const stalePostCategoryId = query<{ id: number }>(
		`SELECT id FROM categories WHERE name = 'Stale post category'`
	)[0].id;
	await page.getByLabel('Stale post category').check();
	await page.getByLabel('Title', { exact: true }).fill('Stale category should roll back');
	await page.getByLabel('Tags').fill('stale-category-tag');
	sql(`DELETE FROM categories WHERE id = ${stalePostCategoryId};`);
	const staleCategoryResponse = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleCategoryResponse).status()).toBe(409);
	await expect(page.getByRole('alert')).toHaveText(
		'Classification information changed. Reload the page and check.'
	);
	await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
		'Stale category should roll back'
	);
	await expect(page.getByLabel('Tags')).toHaveValue('stale-category-tag');
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
	await page.getByLabel('Title', { exact: true }).fill('SvelteKit smoke post');
	await page.getByLabel('Tags').fill('original-tag');

	const stalePostSeriesId = query<{ id: number }>(
		`SELECT id FROM series WHERE title = 'Stale post series'`
	)[0].id;
	await page.locator('#seriesId').selectOption(String(stalePostSeriesId));
	await page.getByLabel('Series position').fill('2');
	await page.getByLabel('Title', { exact: true }).fill('Stale series should roll back');
	await page.getByLabel('Tags').fill('stale-series-tag');
	sql(`DELETE FROM series WHERE id = ${stalePostSeriesId};`);
	const staleSeriesResponse = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleSeriesResponse).status()).toBe(409);
	await expect(page.getByRole('alert')).toHaveText(
		'Classification information changed. Reload the page and check.'
	);
	await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
		'Stale series should roll back'
	);
	await expect(page.getByLabel('Tags')).toHaveValue('stale-series-tag');
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
	await page.getByLabel('Title', { exact: true }).fill('SvelteKit smoke post');
	await page.getByLabel('Tags').fill('original-tag');
	await page.locator('#seriesId').selectOption('');
	await page.getByLabel('Series position').fill('');

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

	const invalidCategoryEdit = await context.request.post('/categories/0/edit?/save', {
		headers: { origin: 'http://localhost:5173' },
		form: { name: 'Invalid route category', description: 'must not exist' }
	});
	expect(await actionStatus(invalidCategoryEdit)).toBe(404);
	expect(
		query<{ value: number }>(
			"SELECT count(*) AS value FROM categories WHERE name = 'Invalid route category'"
		)[0].value
	).toBe(0);

	const invalidSeriesEdit = await context.request.post('/series/0/edit?/save', {
		headers: { origin: 'http://localhost:5173' },
		form: { title: 'Invalid route series', description: 'must not exist' }
	});
	expect(await actionStatus(invalidSeriesEdit)).toBe(404);
	expect(
		query<{ value: number }>(
			"SELECT count(*) AS value FROM series WHERE title = 'Invalid route series'"
		)[0].value
	).toBe(0);
	for (const path of [
		'/categories/abc/edit',
		'/series/-1/edit',
		'/posts/0',
		'/posts/9007199254740992',
		'/posts/9007199254740992/edit'
	])
		expect((await context.request.get(path)).status(), path).toBe(404);

	const staleEditCategoryId = query<{ id: number }>(
		`SELECT id FROM categories WHERE name = 'Stale edit category'`
	)[0].id;
	sql(`DELETE FROM categories WHERE id = ${staleEditCategoryId};`);
	const staleCategoryEdit = await context.request.post(
		`/categories/${staleEditCategoryId}/edit?/save`,
		{
			headers: { origin: 'http://localhost:5173' },
			form: { name: 'Changed stale category', description: 'changed' }
		}
	);
	expect(await actionStatus(staleCategoryEdit)).toBe(409);

	const staleEditSeriesId = query<{ id: number }>(
		`SELECT id FROM series WHERE title = 'Stale edit series'`
	)[0].id;
	sql(`DELETE FROM series WHERE id = ${staleEditSeriesId};`);
	const staleSeriesEdit = await context.request.post(`/series/${staleEditSeriesId}/edit?/save`, {
		headers: { origin: 'http://localhost:5173' },
		form: { title: 'Changed stale series', description: 'changed' }
	});
	expect(await actionStatus(staleSeriesEdit)).toBe(409);

	const staleDeleteSeriesId = query<{ id: number }>(
		`SELECT id FROM series WHERE title = 'Stale delete series'`
	)[0].id;
	sql(`DELETE FROM series WHERE id = ${staleDeleteSeriesId};`);
	const staleSeriesDelete = await context.request.post(
		`/series/${staleDeleteSeriesId}/edit?/delete`,
		{ headers: { origin: 'http://localhost:5173' }, form: {} }
	);
	expect(await actionStatus(staleSeriesDelete)).toBe(404);

	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page).toHaveURL(`/posts/${postId}`);
	await expect(page.getByRole('heading', { name: 'SvelteKit smoke post' })).toBeVisible();
	await expect(page.locator('.article-body img')).toHaveAttribute('src', mediaUrl!);
	await expect(page.locator('.article-body')).toContainText(':::note{type="banana"}');
	await expect(page.locator('.article-body pre code')).toHaveCount(2);
	expect(await page.locator('.article-body pre code').first().textContent()).toContain(
		':::note{type="banana"}\nWrong type\n:::'
	);
	await page.goto('/search?q=Smoke');
	await expect(page.getByRole('link', { name: 'SvelteKit smoke post' })).toBeVisible();
	await page.goto(`/posts/${postId}`);
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
