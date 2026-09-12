import { expect, test } from '@playwright/test';
import {
	actionStatus,
	approveUser,
	cleanupUser,
	login,
	postData,
	query,
	signup,
	sql
} from './support';

const username = 'content_smoke_user';
const categoryNames = [
	'Content category',
	'Stale new category',
	'Stale post category',
	'Stale edit category'
];
const seriesTitles = [
	'Content series',
	'Stale post series',
	'Stale edit series',
	'Stale delete series',
	'Atomic delete series',
	'Date navigation series'
];

function cleanupTaxonomy() {
	sql(
		`DELETE FROM categories WHERE name IN (${categoryNames.map((name) => `'${name}'`).join(',')});`
	);
	sql(
		`DELETE FROM series WHERE title IN (${seriesTitles.map((title) => `'${title}'`).join(',')});`
	);
}

test.beforeEach(async ({ request }) => {
	cleanupUser(username);
	cleanupTaxonomy();
	sql(
		`INSERT INTO categories (name, description) VALUES ${categoryNames.map((name) => `('${name}', 'fixture')`).join(',')};`
	);
	sql(
		`INSERT INTO series (title, description) VALUES ${seriesTitles.map((title) => `('${title}', 'fixture')`).join(',')};`
	);
	const created = await signup(request, username, 'Content Smoke User');
	expect(created.ok(), `${created.status()} ${await created.text()}`).toBe(true);
	approveUser(username);
});

test.afterEach(() => {
	cleanupUser(username);
	cleanupTaxonomy();
});

test('preserves Post and taxonomy integrity across conflicts and publication', async ({
	page,
	context
}) => {
	test.setTimeout(90_000);
	const cspErrors: string[] = [];
	page.on('console', (message) => {
		if (/content security policy|refused to apply.*style/i.test(message.text()))
			cspErrors.push(message.text());
	});

	for (const path of [
		`/search?q=${'a'.repeat(201)}`,
		'/search?from=2026-02-30',
		'/search?series=9007199254740992',
		'/search?category=1.5'
	])
		expect((await context.request.get(path)).status(), path).toBe(400);
	for (const path of ['/posts?page=999999', '/search?page=999999'])
		expect((await context.request.get(path, { maxRedirects: 0 })).status(), path).toBe(303);

	const dateSeriesId = query<{ id: number }>(
		"SELECT id FROM series WHERE title = 'Date navigation series'"
	)[0].id;
	const firstDateAssetId = crypto.randomUUID();
	const secondDateAssetId = crypto.randomUUID();
	const firstPublishedAt = Date.parse('2026-09-01T00:00:00.000Z');
	const secondPublishedAt = Date.parse('2026-09-02T00:00:00.000Z');
	sql(`INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
		SELECT '${firstDateAssetId}', id, 'Date navigation A', 'fixture', 'fixture', ${dateSeriesId}, 1, 0, ${firstPublishedAt}, ${firstPublishedAt}, ${firstPublishedAt}
		FROM user WHERE username = '${username}';
		INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
		SELECT '${secondDateAssetId}', id, 'Date navigation B', 'fixture', 'fixture', ${dateSeriesId}, 2, 0, ${secondPublishedAt}, ${secondPublishedAt}, ${secondPublishedAt}
		FROM user WHERE username = '${username}';`);
	const firstDatePostId = query<{ id: number }>(
		`SELECT id FROM posts WHERE asset_id = '${firstDateAssetId}'`
	)[0].id;
	const secondDatePostId = query<{ id: number }>(
		`SELECT id FROM posts WHERE asset_id = '${secondDateAssetId}'`
	)[0].id;
	await page.goto(`/posts/${firstDatePostId}`);
	const firstDateTime = await page.locator('article time').getAttribute('datetime');
	const firstDateText = await page.locator('article time').innerText();
	await page.getByRole('link', { name: /Date navigation B/ }).click();
	await expect(page).toHaveURL(`/posts/${secondDatePostId}`);
	const secondDateTime = await page.locator('article time').getAttribute('datetime');
	const secondDateText = await page.locator('article time').innerText();
	expect(firstDateTime).toBe('2026-09-01T00:00:00.000Z');
	expect(secondDateTime).toBe('2026-09-02T00:00:00.000Z');
	expect(secondDateTime).not.toBe(firstDateTime);
	expect(secondDateText).not.toBe(firstDateText);

	await login(page, username);
	const assetId = await page.locator('input[name="assetId"]').inputValue();
	await page.getByLabel('Title', { exact: true }).fill('Content smoke post');
	await page.getByLabel('Description').fill('Content integrity smoke test.');
	await page.getByLabel('Body').fill('# Content\n\nPublished body');
	await page.getByLabel('Tags').fill('original-tag');
	await page.getByLabel('Content category').check();
	await page.getByLabel('Stale new category').check();
	const staleNewCategoryId = query<{ id: number }>(
		"SELECT id FROM categories WHERE name = 'Stale new category'"
	)[0].id;
	sql(`DELETE FROM categories WHERE id = ${staleNewCategoryId};`);
	const staleNewSave = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleNewSave).status()).toBe(409);
	await expect(page.getByRole('alert')).toHaveText(
		'The taxonomy changed. Review the current taxonomy and save again.'
	);
	expect(
		query<{ value: number }>(`SELECT count(*) AS value FROM posts WHERE asset_id = '${assetId}'`)[0]
			.value
	).toBe(0);
	const contentSeriesId = query<{ id: number }>(
		"SELECT id FROM series WHERE title = 'Content series'"
	)[0].id;
	const blockerAssetId = crypto.randomUUID();
	sql(`INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
		SELECT '${blockerAssetId}', id, 'Series blocker', 'fixture', 'fixture', ${contentSeriesId}, 1, 0, NULL, 1, 1
		FROM user WHERE username = '${username}';`);
	await page.locator('#seriesId').selectOption(String(contentSeriesId));
	await page.getByLabel('Series position').fill('1');
	const uniqueConflict = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await uniqueConflict).status()).toBe(409);
	await page.locator('#seriesId').selectOption('');
	await page.getByLabel('Series position').fill('');

	const saveDraft = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await saveDraft).status()).toBe(303);
	await expect(page).toHaveURL(/\/posts\/\d+\/edit\?saved=1$/);
	const editUrl = page.url();
	const postId = Number(editUrl.match(/\/posts\/(\d+)\/edit/)?.[1]);
	expect(postId).toBeGreaterThan(0);
	const categoryId = query<{ id: number }>(
		"SELECT id FROM categories WHERE name = 'Content category'"
	)[0].id;

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

	for (const [name, categories, tags] of [
		['none', [], ''],
		['category', [categoryId], ''],
		['tag', [], 'missing-post-tag']
	] as const) {
		const response = await context.request.post('/posts/2147483647/edit?/saveDraft', {
			headers: {
				origin: 'http://localhost:5173',
				'content-type': 'application/x-www-form-urlencoded'
			},
			data: postData({ title: `Missing ${name}`, tags }, [...categories])
		});
		expect(await actionStatus(response), name).toBe(404);
	}

	const stalePostCategoryId = query<{ id: number }>(
		"SELECT id FROM categories WHERE name = 'Stale post category'"
	)[0].id;
	await page.getByLabel('Stale post category').check();
	await page.getByLabel('Title', { exact: true }).fill('Stale category should roll back');
	await page.getByLabel('Tags').fill('stale-category-tag');
	sql(`DELETE FROM categories WHERE id = ${stalePostCategoryId};`);
	const staleCategorySave = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleCategorySave).status()).toBe(409);
	await expect(page.getByRole('alert')).toHaveText(
		'The taxonomy changed. Review the current taxonomy and save again.'
	);
	expect(query<{ title: string }>(`SELECT title FROM posts WHERE id = ${postId}`)[0].title).toBe(
		'Content smoke post'
	);
	expect(query<{ tag: string }>(`SELECT tag FROM post_tags WHERE post_id = ${postId}`)).toEqual([
		{ tag: 'original-tag' }
	]);
	await page.getByLabel('Title', { exact: true }).fill('Content smoke post');
	await page.getByLabel('Tags').fill('original-tag');

	const stalePostSeriesId = query<{ id: number }>(
		"SELECT id FROM series WHERE title = 'Stale post series'"
	)[0].id;
	await page.locator('#seriesId').selectOption(String(stalePostSeriesId));
	await page.getByLabel('Series position').fill('2');
	await page.getByLabel('Title', { exact: true }).fill('Stale series should roll back');
	sql(`DELETE FROM series WHERE id = ${stalePostSeriesId};`);
	const staleSeriesSave = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleSeriesSave).status()).toBe(409);
	expect(query<{ title: string }>(`SELECT title FROM posts WHERE id = ${postId}`)[0].title).toBe(
		'Content smoke post'
	);
	await page.getByLabel('Title', { exact: true }).fill('Content smoke post');
	await page.locator('#seriesId').selectOption('');
	await page.getByLabel('Series position').fill('');

	const directConflict = await context.request.post(`/posts/${postId}/edit?/saveDraft`, {
		headers: {
			origin: 'http://localhost:5173',
			'content-type': 'application/x-www-form-urlencoded'
		},
		data: postData(
			{
				title: 'Partially changed',
				seriesId: String(contentSeriesId),
				seriesPosition: '1',
				tags: 'should-not-save'
			},
			[categoryId]
		)
	});
	expect(await actionStatus(directConflict)).toBe(409);
	expect(query<{ title: string }>(`SELECT title FROM posts WHERE id = ${postId}`)[0].title).toBe(
		'Content smoke post'
	);
	expect(query<{ tag: string }>(`SELECT tag FROM post_tags WHERE post_id = ${postId}`)).toEqual([
		{ tag: 'original-tag' }
	]);

	for (const path of [
		'/categories/abc/edit',
		'/series/-1/edit',
		'/posts/0',
		'/posts/9007199254740992',
		'/posts/9007199254740992/edit'
	])
		expect((await context.request.get(path)).status(), path).toBe(404);

	const invalidCategoryEdit = await context.request.post('/categories/0/edit?/save', {
		headers: { origin: 'http://localhost:5173' },
		form: { name: 'Invalid route category', description: 'must not exist' }
	});
	expect(await actionStatus(invalidCategoryEdit)).toBe(404);
	const invalidSeriesEdit = await context.request.post('/series/0/edit?/save', {
		headers: { origin: 'http://localhost:5173' },
		form: { title: 'Invalid route series', description: 'must not exist' }
	});
	expect(await actionStatus(invalidSeriesEdit)).toBe(404);

	const staleEditCategoryId = query<{ id: number }>(
		"SELECT id FROM categories WHERE name = 'Stale edit category'"
	)[0].id;
	sql(`DELETE FROM categories WHERE id = ${staleEditCategoryId};`);
	expect(
		await actionStatus(
			await context.request.post(`/categories/${staleEditCategoryId}/edit?/save`, {
				headers: { origin: 'http://localhost:5173' },
				form: { name: 'Changed stale category', description: 'changed' }
			})
		)
	).toBe(409);
	const staleEditSeriesId = query<{ id: number }>(
		"SELECT id FROM series WHERE title = 'Stale edit series'"
	)[0].id;
	sql(`DELETE FROM series WHERE id = ${staleEditSeriesId};`);
	expect(
		await actionStatus(
			await context.request.post(`/series/${staleEditSeriesId}/edit?/save`, {
				headers: { origin: 'http://localhost:5173' },
				form: { title: 'Changed stale series', description: 'changed' }
			})
		)
	).toBe(409);

	const atomicSeriesId = query<{ id: number }>(
		"SELECT id FROM series WHERE title = 'Atomic delete series'"
	)[0].id;
	const atomicAssetId = crypto.randomUUID();
	sql(`INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
		SELECT '${atomicAssetId}', id, 'Atomic series post', 'fixture', 'fixture', ${atomicSeriesId}, 3, 0, NULL, 1, 1
		FROM user WHERE username = '${username}';`);
	expect(
		await actionStatus(
			await context.request.post(`/series/${atomicSeriesId}/edit?/delete`, {
				headers: { origin: 'http://localhost:5173' },
				form: {}
			})
		)
	).toBe(303);
	expect(
		query<{ seriesId: number | null; seriesPosition: number | null }>(
			`SELECT series_id AS seriesId, series_position AS seriesPosition FROM posts WHERE asset_id = '${atomicAssetId}'`
		)[0]
	).toEqual({ seriesId: null, seriesPosition: null });

	const futureAssetId = crypto.randomUUID();
	const future = await context.request.post('/posts/new?/publish', {
		maxRedirects: 0,
		headers: {
			origin: 'http://localhost:5173',
			'content-type': 'application/x-www-form-urlencoded'
		},
		data: postData({
			assetId: futureAssetId,
			title: 'Future content post',
			publishedAt: '2099-01-01T00:00'
		})
	});
	expect(await actionStatus(future)).toBe(303);
	const futureId = query<{ id: number }>(
		`SELECT id FROM posts WHERE asset_id = '${futureAssetId}'`
	)[0].id;
	expect((await context.request.get(`/posts/${futureId}`)).status()).toBe(404);
	expect((await context.request.get(`/posts/${futureId}/edit`)).status()).toBe(200);

	await page.goto(editUrl);
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page).toHaveURL(`/posts/${postId}`);
	await expect(page.getByRole('heading', { name: 'Content smoke post' })).toBeVisible();
	await page.goto('/search?q=Content');
	await expect(page.getByRole('link', { name: 'Content smoke post' })).toBeVisible();
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'http://localhost:5173/search'
	);
	const searchResultsMargin = await page
		.locator('.search-results')
		.evaluate((element) => Number.parseFloat(getComputedStyle(element).marginTop));
	expect(searchResultsMargin).toBeGreaterThanOrEqual(24);
	await page.goto(`/posts/${postId}`);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		`http://localhost:5173/posts/${postId}`
	);
	await page.getByRole('link', { name: 'Content Smoke User' }).click();
	await expect(page).toHaveURL(`/search?author=${username}`);
	await expect(page.getByRole('link', { name: 'Content smoke post' })).toBeVisible();
	expect(await (await context.request.get('/rss.xml')).text()).toContain('Content smoke post');
	expect(await (await context.request.get('/sitemap.xml')).text()).toContain(`/posts/${postId}`);

	await page.goto(editUrl);
	await page.getByLabel('Title', { exact: true }).fill('Edited content post');
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByRole('heading', { name: 'Edited content post' })).toBeVisible();
	await page.getByRole('link', { name: 'Edit' }).click();
	page.once('dialog', (dialog) => dialog.accept());
	await page.locator('button[formaction="?/delete"]').click();
	await expect(page).toHaveURL('/posts');
	for (const path of ['/', '/posts', '/search', '/archive', '/series', '/categories']) {
		await page.goto(path);
		await expect(page.locator('main')).toBeVisible();
	}
	expect(cspErrors).toEqual([]);
});
