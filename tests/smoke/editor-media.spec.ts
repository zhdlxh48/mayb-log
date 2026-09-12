import { expect, test } from '@playwright/test';
import { approveUser, cleanupUser, login, png, signup } from './support';

const username = 'media_smoke_user';

test.beforeEach(async ({ request }) => {
	cleanupUser(username);
	const created = await signup(request, username, 'Media Smoke User');
	expect(created.ok(), `${created.status()} ${await created.text()}`).toBe(true);
	approveUser(username);
});

test.afterEach(() => cleanupUser(username));

test('keeps editor preview and media lifecycle consistent', async ({ page, context }) => {
	test.setTimeout(90_000);
	const importReadErrors: string[] = [];
	page.on('pageerror', (error) => {
		if (error.message.includes('File read regression failure'))
			importReadErrors.push(error.message);
	});
	await login(page, username);
	await expect(page).toHaveURL('/posts/new');
	const assetId = await page.locator('input[name="assetId"]').inputValue();
	await page.getByLabel('Title', { exact: true }).fill('Media smoke post');
	await page.getByLabel('Description').fill('Media lifecycle smoke test.');
	await page.getByLabel('Body').fill('# Media\n\nInitial body');

	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'primary.png', mimeType: 'image/png', buffer: png });
	const primaryItem = page.locator('.image-item').first();
	await expect(primaryItem).toBeVisible();
	const primaryUrl = await primaryItem.locator('img').getAttribute('src');
	expect(primaryUrl).toMatch(new RegExp(`^/media/${assetId}/[0-9a-f-]{36}\\.webp$`));
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(primaryUrl!));
	const beforeInsert = await page.getByLabel('Body').inputValue();
	await primaryItem.getByRole('button', { name: /^Insert / }).click();
	await expect(page.getByLabel('Body')).toHaveValue(`${beforeInsert}![image](${primaryUrl})`);

	for (const [data, status] of [
		[{ imageIds: ['not-a-uuid'] }, 400],
		[{ imageIds: Array.from({ length: 21 }, () => crypto.randomUUID()) }, 400]
	] as const) {
		const response = await context.request.delete(`/api/media/${assetId}`, {
			headers: { origin: 'http://localhost:5173' },
			data
		});
		expect(response.status()).toBe(status);
	}

	for (let index = 0; index < 2; index += 1) {
		await page
			.getByLabel('Upload image')
			.setInputFiles({ name: `delete-${index}.png`, mimeType: 'image/png', buffer: png });
		await expect(page.locator('.image-item')).toHaveCount(index + 2);
	}
	const disposableIds = await page
		.locator('.image-item')
		.evaluateAll((items) => items.slice(1).map((item) => item.getAttribute('data-image-id')!));
	for (const id of disposableIds)
		await page.locator(`[data-image-id="${id}"]`).getByRole('checkbox').check();
	const deleteRequests: { imageIds: string[] }[] = [];
	page.on('request', (request) => {
		if (
			request.method() === 'DELETE' &&
			new URL(request.url()).pathname === `/api/media/${assetId}`
		)
			deleteRequests.push(request.postDataJSON() as { imageIds: string[] });
	});
	page.once('dialog', (dialog) => dialog.accept());
	const multiDelete = page.waitForResponse(
		(response) => response.request().method() === 'DELETE' && response.url().endsWith(assetId)
	);
	await page.getByRole('button', { name: 'Delete selected (2)' }).click();
	expect((await multiDelete).status()).toBe(204);
	expect(deleteRequests).toEqual([{ imageIds: disposableIds }]);
	await expect(page.locator('.image-item')).toHaveCount(1);

	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'delete-one.png', mimeType: 'image/png', buffer: png });
	await expect(page.locator('.image-item')).toHaveCount(2);
	const singleDeleteItem = page.locator('.image-item').last();
	const singleDeleteUrl = await singleDeleteItem.locator('img').getAttribute('src');
	await singleDeleteItem.getByRole('checkbox').check();
	page.once('dialog', (dialog) => dialog.accept());
	const singleDelete = page.waitForResponse(
		(response) => response.request().method() === 'DELETE' && response.url().endsWith(assetId)
	);
	await page.getByRole('button', { name: 'Delete selected (1)' }).click();
	expect((await singleDelete).status()).toBe(204);
	await expect(page.locator('.image-item')).toHaveCount(1);
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(singleDeleteUrl!));

	page.once('dialog', (dialog) => dialog.accept());
	await page.getByLabel('Import .md').setInputFiles({
		name: 'import.md',
		mimeType: 'text/markdown',
		buffer: Buffer.from('# Imported\n\nMarkdown body')
	});
	await expect(page.getByLabel('Body')).toHaveValue('# Imported\n\nMarkdown body');
	const importedMarkdown = await page.getByLabel('Body').inputValue();
	await page.getByLabel('Import .md').setInputFiles({
		name: 'too-large.md',
		mimeType: 'text/markdown',
		buffer: Buffer.alloc(1024 * 1024 + 1, 'a')
	});
	await expect(page.getByRole('alert')).toHaveText('The Markdown body is too large.');
	await expect(page.getByLabel('Body')).toHaveValue(importedMarkdown);
	await page.evaluate(() => {
		File.prototype.text = () => Promise.reject(new Error('File read regression failure'));
	});
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByLabel('Import .md').setInputFiles({
		name: 'unreadable.md',
		mimeType: 'text/markdown',
		buffer: Buffer.from('# Unreadable')
	});
	await expect(page.getByRole('alert')).toHaveText('Could not read the Markdown file.');
	await expect(page.getByLabel('Body')).toHaveValue(importedMarkdown);
	expect(importReadErrors).toEqual([]);

	const malformedPreview = await context.request.post('/api/markdown-preview', {
		headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
		data: '{'
	});
	expect(malformedPreview.status()).toBe(400);
	const oversizedPreview = await context.request.post('/api/markdown-preview', {
		headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
		data: JSON.stringify({ bodyMarkdown: 'a'.repeat(4 * 1024 * 1024) })
	});
	expect(oversizedPreview.status()).toBe(413);
	const oversizedMarkdown = await context.request.post('/api/markdown-preview', {
		headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
		data: JSON.stringify({ bodyMarkdown: 'a'.repeat(1024 * 1024 + 1) })
	});
	expect(oversizedMarkdown.status()).toBe(413);

	const previewUrlPattern = '**/api/markdown-preview';
	const previewSources: string[] = [];
	let markFirstPreviewStarted = () => {};
	const firstPreviewStarted = new Promise<void>((resolve) => (markFirstPreviewStarted = resolve));
	let releaseFirstPreview = () => {};
	const firstPreviewRelease = new Promise<void>((resolve) => (releaseFirstPreview = resolve));
	let markFirstPreviewCompleted = () => {};
	const firstPreviewCompleted = new Promise<void>(
		(resolve) => (markFirstPreviewCompleted = resolve)
	);
	let markStaleFailureStarted = () => {};
	const staleFailureStarted = new Promise<void>((resolve) => (markStaleFailureStarted = resolve));
	let releaseStaleFailure = () => {};
	const staleFailureRelease = new Promise<void>((resolve) => (releaseStaleFailure = resolve));
	let markStaleFailureCompleted = () => {};
	const staleFailureCompleted = new Promise<void>(
		(resolve) => (markStaleFailureCompleted = resolve)
	);
	await page.route(previewUrlPattern, async (route) => {
		if (route.request().method() !== 'POST') return route.continue();
		const source = (route.request().postDataJSON() as { bodyMarkdown: string }).bodyMarkdown;
		previewSources.push(source);
		if (source === '# Preview A') {
			markFirstPreviewStarted();
			await firstPreviewRelease;
			await route.fulfill({ json: { html: '<h1>Preview A</h1>', diagnostics: [] } });
			markFirstPreviewCompleted();
			return;
		}
		if (source === '# Preview B') {
			await route.fulfill({ json: { html: '<h1>Preview B</h1>', diagnostics: [] } });
			return;
		}
		if (source === '# Stale failure') {
			markStaleFailureStarted();
			await staleFailureRelease;
			await route.fulfill({ status: 500 });
			markStaleFailureCompleted();
			return;
		}
		await route.continue();
	});

	await page.getByLabel('Body').fill('# Preview A');
	await page.getByRole('button', { name: 'Preview' }).click();
	await firstPreviewStarted;
	await page.getByRole('button', { name: 'Write' }).click();
	await page.getByLabel('Body').fill('# Preview B');
	await page.getByRole('button', { name: 'Preview' }).click();
	await expect(page.locator('.preview h1')).toHaveText('Preview B');
	releaseFirstPreview();
	await firstPreviewCompleted;
	await expect(page.locator('.preview h1')).toHaveText('Preview B');

	await page.getByRole('button', { name: 'Write' }).click();
	await page.getByLabel('Body').fill('# Stale failure');
	await page.getByRole('button', { name: 'Preview' }).click();
	await staleFailureStarted;
	await page.getByRole('button', { name: 'Write' }).click();
	await page.getByLabel('Body').fill('# Preview B');
	await page.getByRole('button', { name: 'Preview' }).click();
	await expect(page.locator('.preview h1')).toHaveText('Preview B');
	await expect(page.locator('.preview')).not.toContainText('Generating preview.');
	await expect(page.locator('.preview [role="alert"]')).toHaveCount(0);
	releaseStaleFailure();
	await staleFailureCompleted;
	await expect(page.locator('.preview h1')).toHaveText('Preview B');
	await expect(page.locator('.preview')).not.toContainText('Generating preview.');
	await expect(page.locator('.preview [role="alert"]')).toHaveCount(0);
	expect(previewSources.filter((source) => source === '# Preview B')).toHaveLength(1);
	await page.unroute(previewUrlPattern);

	const markdownWithWarnings = `# Media

![image](${primaryUrl})

:::note{type="banana"}
Wrong type
:::

:::future_widget{foo="bar"}
Unknown widget
:::`;
	await page.getByRole('button', { name: 'Write' }).click();
	await page.getByLabel('Body').fill(markdownWithWarnings);
	await page.getByRole('button', { name: 'Preview' }).click();
	await expect(page.locator('.preview h1')).toHaveText('Media');
	await expect(page.locator('.preview .article-body pre code')).toHaveCount(2);
	await expect(page.getByRole('heading', { name: 'Warnings (2)' })).toBeVisible();
	await expect(page.locator('.preview-warnings li')).toHaveCount(2);

	const savedDraft = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await savedDraft).status()).toBe(303);
	await expect(page).toHaveURL(/\/posts\/\d+\/edit\?saved=1$/);
	const primaryImage = await context.request.get(primaryUrl!);
	expect(primaryImage.status()).toBe(200);
	const webp = await primaryImage.body();
	const paginationImages: { id: string; url: string }[] = [];
	for (let index = 0; index < 20; index += 1) {
		const response = await context.request.post(`/api/media/${assetId}`, {
			headers: { origin: 'http://localhost:5173' },
			multipart: { file: { name: `page-${index}.webp`, mimeType: 'image/webp', buffer: webp } }
		});
		expect(response.status()).toBe(201);
		paginationImages.push((await response.json()) as { id: string; url: string });
	}
	await page.reload();
	await expect(page.locator('.image-item')).toHaveCount(20);
	await expect(page.getByText('Page 1 / 2')).toBeVisible();
	const imagePageUrl = page.url();
	await page.getByLabel('Title', { exact: true }).fill('Pagination state kept');
	await page.locator('.image-item').nth(0).getByRole('checkbox').check();
	await page.locator('.image-item').nth(1).getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page).toHaveURL(imagePageUrl);
	await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Pagination state kept');
	await expect(page.locator('.image-item')).toHaveCount(1);
	await expect(page.locator('.image-item input:checked')).toHaveCount(0);
	await page.getByRole('button', { name: 'Previous' }).click();

	await page.locator('.image-item').first().getByRole('checkbox').check();
	const mediaUrlPattern = `**/api/media/${assetId}`;
	let markUploadStarted = () => {};
	const uploadStarted = new Promise<void>((resolve) => (markUploadStarted = resolve));
	let releaseUpload = () => {};
	const uploadRelease = new Promise<void>((resolve) => (releaseUpload = resolve));
	await page.route(mediaUrlPattern, async (route) => {
		if (route.request().method() !== 'POST') return route.continue();
		markUploadStarted();
		await uploadRelease;
		await route.continue();
	});
	const uploadResponse = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().endsWith(assetId)
	);
	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'locked-upload.png', mimeType: 'image/png', buffer: png });
	await uploadStarted;
	await expect(page.getByLabel('Upload image')).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Delete selected (1)' })).toBeDisabled();
	await expect(page.locator('.image-item').first().getByRole('checkbox')).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
	await expect(
		page
			.locator('.image-item')
			.first()
			.getByRole('button', { name: /^Insert / })
	).toBeEnabled();
	releaseUpload();
	const uploaded = (await uploadResponse).status();
	expect(uploaded).toBe(201);
	await page.unroute(mediaUrlPattern);
	await expect(page.getByText('Page 2 / 2')).toBeVisible();
	const uploadedItem = page.locator('.image-item').last();
	const uploadedId = await uploadedItem.getAttribute('data-image-id');
	const uploadedUrl = await uploadedItem.locator('img').getAttribute('src');
	await expect(page.locator('.image-item input:checked')).toHaveCount(0);
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(uploadedUrl!));

	const orderingReload = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await orderingReload).status()).toBe(303);
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('.image-item').last()).toHaveAttribute('data-image-id', uploadedId!);
	await page.locator('.image-item').first().getByRole('checkbox').check();
	const selectedId = await page.locator('.image-item').first().getAttribute('data-image-id');

	await page.route(mediaUrlPattern, async (route) => {
		if (route.request().method() === 'POST') await route.fulfill({ status: 500 });
		else await route.continue();
	});
	await page
		.getByLabel('Upload image')
		.setInputFiles({ name: 'failed-upload.png', mimeType: 'image/png', buffer: png });
	await expect(page.getByRole('alert')).toHaveText('Could not upload the image.');
	await expect(page.getByText('Page 2 / 2')).toBeVisible();
	await expect(page.locator(`[data-image-id="${selectedId}"]`).getByRole('checkbox')).toBeChecked();
	await expect(page.locator('.image-item')).toHaveCount(2);
	await page.unroute(mediaUrlPattern);

	let markDeleteStarted = () => {};
	const deleteStarted = new Promise<void>((resolve) => (markDeleteStarted = resolve));
	let releaseDelete = () => {};
	const deleteRelease = new Promise<void>((resolve) => (releaseDelete = resolve));
	await page.route(mediaUrlPattern, async (route) => {
		if (route.request().method() !== 'DELETE') return route.continue();
		markDeleteStarted();
		await deleteRelease;
		await route.fulfill({ status: 500 });
	});
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Delete selected (1)' }).click();
	await deleteStarted;
	await expect(page.getByLabel('Upload image')).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Delete selected (1)' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
	releaseDelete();
	await expect(page.getByRole('alert')).toHaveText('Could not delete the image.');
	await page.unroute(mediaUrlPattern);
	await expect(page.locator(`[data-image-id="${selectedId}"]`).getByRole('checkbox')).toBeChecked();

	await page.route(mediaUrlPattern, (route) =>
		route.request().method() === 'DELETE' ? route.abort() : route.continue()
	);
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Delete selected (1)' }).click();
	await expect(page.getByRole('alert')).toHaveText('Could not delete the image.');
	await page.unroute(mediaUrlPattern);
	await expect(page.locator(`[data-image-id="${selectedId}"]`).getByRole('checkbox')).toBeChecked();

	await page.locator('.image-item').last().getByRole('checkbox').check();
	page.once('dialog', (dialog) => dialog.accept());
	const successfulDelete = page.waitForResponse(
		(response) => response.request().method() === 'DELETE' && response.url().endsWith(assetId)
	);
	await page.getByRole('button', { name: 'Delete selected (2)' }).click();
	expect((await successfulDelete).status()).toBe(204);
	await expect(page.getByText('Page 1 / 1')).toHaveCount(0);
	await expect(page.locator('.image-item')).toHaveCount(20);
	await expect(page.getByLabel('Body')).toHaveValue(new RegExp(uploadedUrl!));

	const allIds = [
		primaryUrl!.split('/').at(-1)!.replace('.webp', ''),
		...paginationImages.map(({ id }) => id),
		uploadedId!
	];
	const preservedItem = page.locator('.image-item').first();
	const preservedId = await preservedItem.getAttribute('data-image-id');
	await preservedItem.getByRole('checkbox').check();
	await context.clearCookies();
	page.once('dialog', (dialog) => dialog.accept());
	const deniedDelete = page.waitForResponse(
		(response) => response.request().method() === 'DELETE' && response.url().endsWith(assetId)
	);
	await page.getByRole('button', { name: 'Delete selected (1)' }).click();
	expect((await deniedDelete).status()).toBe(401);
	await expect(page.getByRole('alert')).toHaveText('Could not delete the image.');
	await expect(
		page.locator(`[data-image-id="${preservedId}"]`).getByRole('checkbox')
	).toBeChecked();

	await page.getByRole('button', { name: 'Write' }).click();
	await page.getByLabel('Body').fill('# Expired session');
	const deniedPreview = page.waitForResponse(
		(response) =>
			response.request().method() === 'POST' && response.url().endsWith('/api/markdown-preview')
	);
	await page.getByRole('button', { name: 'Preview' }).click();
	expect((await deniedPreview).status()).toBe(401);
	await expect(page.locator('.preview [role="alert"]')).toHaveText('Could not generate preview.');

	await login(page, username);
	for (let index = 0; index < allIds.length; index += 20)
		await context.request.delete(`/api/media/${assetId}`, {
			headers: { origin: 'http://localhost:5173' },
			data: { imageIds: allIds.slice(index, index + 20) }
		});
});
