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

async function cleanupTaxonomy() {
	await sql('DELETE FROM categories WHERE name = ANY($1::text[])', [categoryNames]);
	await sql('DELETE FROM series WHERE title = ANY($1::text[])', [seriesTitles]);
}

test.beforeEach(async ({ request }) => {
	await cleanupUser(username);
	await cleanupTaxonomy();
	await sql(
		"INSERT INTO categories (name, description) SELECT name, 'fixture' FROM unnest($1::text[]) AS name",
		[categoryNames]
	);
	await sql(
		"INSERT INTO series (title, description) SELECT title, 'fixture' FROM unnest($1::text[]) AS title",
		[seriesTitles]
	);
	const created = await signup(request, username, 'Content Smoke User');
	expect(created.ok(), `${created.status()} ${await created.text()}`).toBe(true);
	await approveUser(username);
});

test.afterEach(async () => {
	await cleanupUser(username);
	await cleanupTaxonomy();
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

	const dateSeriesId = (
		await query<{ id: number }>("SELECT id FROM series WHERE title = 'Date navigation series'")
	)[0].id;
	const firstDateAssetId = crypto.randomUUID();
	const secondDateAssetId = crypto.randomUUID();
	const firstPublishedAt = new Date('2026-09-01T00:00:00.000Z');
	const secondPublishedAt = new Date('2026-09-02T00:00:00.000Z');
	for (const [assetId, title, position, publishedAt] of [
		[firstDateAssetId, 'Date navigation A', 1, firstPublishedAt],
		[secondDateAssetId, 'Date navigation B', 2, secondPublishedAt]
	] as const)
		await sql(
			`INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
			 SELECT $1, id, $2, 'fixture', 'fixture', $3, $4, false, $5, $5, $5 FROM "user" WHERE username = $6`,
			[assetId, title, dateSeriesId, position, publishedAt, username]
		);
	const firstDatePostId = (
		await query<{ id: number }>(`SELECT id FROM posts WHERE asset_id = '${firstDateAssetId}'`)
	)[0].id;
	const secondDatePostId = (
		await query<{ id: number }>(`SELECT id FROM posts WHERE asset_id = '${secondDateAssetId}'`)
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
	const taxonomyPage = await context.newPage();
	await taxonomyPage.goto('/series/new');
	await taxonomyPage.getByLabel('Title', { exact: true }).fill('Validation series');
	await taxonomyPage.getByLabel('Description').fill('a'.repeat(501));
	const taxonomyValidation = taxonomyPage.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().endsWith('/series/new')
	);
	await taxonomyPage.getByRole('button', { name: 'Save' }).click();
	expect(await actionStatus(await taxonomyValidation)).toBe(400);
	await expect(taxonomyPage.locator('textarea + .field-error')).toHaveText(
		'The description must have no more than 500 characters.'
	);
	await expect(taxonomyPage.getByLabel('Description')).toHaveValue('a'.repeat(501));
	await taxonomyPage.close();

	await page.getByLabel('Title', { exact: true }).fill('Validation post');
	await page.getByLabel('Description').fill('Validation description');
	await page.getByLabel('Body').fill('Validation body');
	await page.getByLabel('Subtitle').fill('a'.repeat(301));
	const subtitleValidation = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect(await actionStatus(await subtitleValidation)).toBe(400);
	await expect(page.locator('.subtitle-field .field-error')).toHaveText(
		'The subtitle must have no more than 300 characters.'
	);
	await expect(page.getByLabel('Subtitle')).toHaveValue('a'.repeat(301));
	await page.getByLabel('Subtitle').fill('');

	await page
		.locator('form')
		.first()
		.evaluate((form) => {
			for (let id = 1; id <= 31; id += 1) {
				const input = document.createElement('input');
				input.type = 'hidden';
				input.name = 'categories';
				input.value = String(id);
				form.appendChild(input);
			}
		});
	const categoryValidation = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect(await actionStatus(await categoryValidation)).toBe(400);
	await expect(page.locator('.categories-field .field-error')).toHaveText(
		'Select no more than 30 categories per post.'
	);
	expect(
		await page
			.locator('.categories-field')
			.evaluate((element) => element.nextElementSibling?.getAttribute('for'))
	).toBe('tags');
	const selectedCategories = page.locator('input[name="categories"]:checked');
	while (await selectedCategories.count()) await selectedCategories.first().uncheck();

	const assetId = await page.locator('input[name="assetId"]').inputValue();
	await page.getByLabel('Title', { exact: true }).fill('Content smoke post');
	await page.getByLabel('Description').fill('Content integrity smoke test.');
	await page.getByLabel('Body').fill('# Content\n\nPublished body');
	await page.getByLabel('Tags').fill('original-tag');
	await page.getByLabel('Content category').check();
	await page.getByLabel('Stale new category').check();
	const staleNewCategoryId = (
		await query<{ id: number }>("SELECT id FROM categories WHERE name = 'Stale new category'")
	)[0].id;
	await sql(`DELETE FROM categories WHERE id = ${staleNewCategoryId};`);
	const staleNewSave = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleNewSave).status()).toBe(409);
	await expect(page.getByRole('alert')).toHaveText(
		'The taxonomy changed. Review the current taxonomy and save again.'
	);
	expect(
		(
			await query<{ value: number }>(
				`SELECT count(*)::int AS value FROM posts WHERE asset_id = '${assetId}'`
			)
		)[0].value
	).toBe(0);
	const contentSeriesId = (
		await query<{ id: number }>("SELECT id FROM series WHERE title = 'Content series'")
	)[0].id;
	const blockerAssetId = crypto.randomUUID();
	await sql(
		`INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
		 SELECT $1, id, 'Series blocker', 'fixture', 'fixture', $2, 1, false, NULL, now(), now() FROM "user" WHERE username = $3`,
		[blockerAssetId, contentSeriesId, username]
	);
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
	const categoryId = (
		await query<{ id: number }>("SELECT id FROM categories WHERE name = 'Content category'")
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
		(
			await query<{ value: number }>(
				`SELECT count(*)::int AS value FROM posts WHERE asset_id = '${invalidDateAssetId}'`
			)
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

	const stalePostCategoryId = (
		await query<{ id: number }>("SELECT id FROM categories WHERE name = 'Stale post category'")
	)[0].id;
	await page.getByLabel('Stale post category').check();
	await page.getByLabel('Title', { exact: true }).fill('Stale category should roll back');
	await page.getByLabel('Tags').fill('stale-category-tag');
	await sql(`DELETE FROM categories WHERE id = ${stalePostCategoryId};`);
	const staleCategorySave = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleCategorySave).status()).toBe(409);
	await expect(page.getByRole('alert')).toHaveText(
		'The taxonomy changed. Review the current taxonomy and save again.'
	);
	expect(
		(await query<{ title: string }>(`SELECT title FROM posts WHERE id = ${postId}`))[0].title
	).toBe('Content smoke post');
	expect(
		await query<{ tag: string }>(`SELECT tag FROM post_tags WHERE post_id = ${postId}`)
	).toEqual([{ tag: 'original-tag' }]);
	await page.getByLabel('Title', { exact: true }).fill('Content smoke post');
	await page.getByLabel('Tags').fill('original-tag');

	const stalePostSeriesId = (
		await query<{ id: number }>("SELECT id FROM series WHERE title = 'Stale post series'")
	)[0].id;
	await page.locator('#seriesId').selectOption(String(stalePostSeriesId));
	await page.getByLabel('Series position').fill('2');
	await page.getByLabel('Title', { exact: true }).fill('Stale series should roll back');
	await sql(`DELETE FROM series WHERE id = ${stalePostSeriesId};`);
	const staleSeriesSave = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().includes('?/saveDraft')
	);
	await page.getByRole('button', { name: 'Save draft' }).click();
	expect((await staleSeriesSave).status()).toBe(409);
	expect(
		(await query<{ title: string }>(`SELECT title FROM posts WHERE id = ${postId}`))[0].title
	).toBe('Content smoke post');
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
	expect(
		(await query<{ title: string }>(`SELECT title FROM posts WHERE id = ${postId}`))[0].title
	).toBe('Content smoke post');
	expect(
		await query<{ tag: string }>(`SELECT tag FROM post_tags WHERE post_id = ${postId}`)
	).toEqual([{ tag: 'original-tag' }]);

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

	const staleEditCategoryId = (
		await query<{ id: number }>("SELECT id FROM categories WHERE name = 'Stale edit category'")
	)[0].id;
	await sql(`DELETE FROM categories WHERE id = ${staleEditCategoryId};`);
	expect(
		await actionStatus(
			await context.request.post(`/categories/${staleEditCategoryId}/edit?/save`, {
				headers: { origin: 'http://localhost:5173' },
				form: { name: 'Changed stale category', description: 'changed' }
			})
		)
	).toBe(409);
	const staleEditSeriesId = (
		await query<{ id: number }>("SELECT id FROM series WHERE title = 'Stale edit series'")
	)[0].id;
	await sql(`DELETE FROM series WHERE id = ${staleEditSeriesId};`);
	expect(
		await actionStatus(
			await context.request.post(`/series/${staleEditSeriesId}/edit?/save`, {
				headers: { origin: 'http://localhost:5173' },
				form: { title: 'Changed stale series', description: 'changed' }
			})
		)
	).toBe(409);

	const atomicSeriesId = (
		await query<{ id: number }>("SELECT id FROM series WHERE title = 'Atomic delete series'")
	)[0].id;
	const atomicAssetId = crypto.randomUUID();
	await sql(
		`INSERT INTO posts (asset_id, author_id, title, description, body_markdown, series_id, series_position, noindex, published_at, created_at, updated_at)
		 SELECT $1, id, 'Atomic series post', 'fixture', 'fixture', $2, 3, false, NULL, now(), now() FROM "user" WHERE username = $3`,
		[atomicAssetId, atomicSeriesId, username]
	);
	expect(
		await actionStatus(
			await context.request.post(`/series/${atomicSeriesId}/edit?/delete`, {
				headers: { origin: 'http://localhost:5173' },
				form: {}
			})
		)
	).toBe(303);
	expect(
		(
			await query<{ seriesId: number | null; seriesPosition: number | null }>(
				`SELECT series_id AS "seriesId", series_position AS "seriesPosition" FROM posts WHERE asset_id = '${atomicAssetId}'`
			)
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
	const futureId = (
		await query<{ id: number }>(`SELECT id FROM posts WHERE asset_id = '${futureAssetId}'`)
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
	expect(await (await context.request.get(`/rss.xml?fixture=${postId}`)).text()).toContain(
		'Content smoke post'
	);
	expect(await (await context.request.get(`/sitemap.xml?fixture=${postId}`)).text()).toContain(
		`/posts/${postId}`
	);

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
	const robots = await context.request.get('/robots.txt');
	expect(robots.status()).toBe(200);
	expect(robots.headers()['content-type']).toContain('text/plain');
	expect(await robots.text()).toBe(
		'User-agent: *\nAllow: /\nSitemap: http://localhost:5173/sitemap.xml\n'
	);
	expect(cspErrors).toEqual([]);
});

test('preserves PostgreSQL search fields, filters, dates, and pagination', async ({ request }) => {
	const authorId = (
		await query<{ id: string }>('SELECT id FROM "user" WHERE username = $1', [username])
	)[0].id;
	const [firstCategory, secondCategory] = await query<{ id: number; name: string }>(
		'SELECT id, name FROM categories WHERE name = ANY($1::text[]) ORDER BY name',
		[['Content category', 'Stale new category']]
	);

	async function addPost(
		title: string,
		subtitle: string,
		description: string,
		body: string,
		publishedAt: Date
	) {
		return (
			await query<{ id: number }>(
				`INSERT INTO posts
					(asset_id, author_id, title, subtitle, description, body_markdown, noindex, published_at, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, false, $7, $7, $7)
				 RETURNING id`,
				[crypto.randomUUID(), authorId, title, subtitle, description, body, publishedAt]
			)
		)[0].id;
	}

	const titlePostId = await addPost(
		'Search titlemarker 단 두글',
		'',
		'plain description',
		'plain body',
		new Date('2026-09-10T00:00:00.000Z')
	);
	const subtitlePostId = await addPost(
		'Search subtitle result',
		'submarker',
		'plain description',
		'plain body',
		new Date('2026-09-11T00:00:00.000Z')
	);
	const descriptionPostId = await addPost(
		'Search description result',
		'',
		'descmarker',
		'plain body',
		new Date('2026-09-12T00:00:00.000Z')
	);
	const bodyPostId = await addPost(
		'Search body result',
		'',
		'plain description',
		'bodymarker 대한민국 단 두글',
		new Date('2026-09-13T00:00:00.000Z')
	);
	await sql(
		'INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2), ($1, $3), ($4, $2)',
		[titlePostId, firstCategory.id, secondCategory.id, subtitlePostId]
	);
	await sql(
		"INSERT INTO post_tags (post_id, tag) VALUES ($1, 'alpha'), ($1, 'beta'), ($2, 'alpha')",
		[titlePostId, descriptionPostId]
	);

	for (const [queryText, expectedTitle] of [
		['titlemarker', 'Search titlemarker 단 두글'],
		['submarker', 'Search subtitle result'],
		['descmarker', 'Search description result'],
		['bodymarker', 'Search body result'],
		['대한민국', 'Search body result']
	] as const) {
		const body = await (await request.get(`/search?q=${encodeURIComponent(queryText)}`)).text();
		expect(body, queryText).toContain(expectedTitle);
	}
	for (const queryText of ['단', '두글']) {
		const body = await (await request.get(`/search?q=${encodeURIComponent(queryText)}`)).text();
		expect(body, queryText).toContain('Search titlemarker 단 두글');
		expect(body, queryText).not.toContain('Search body result');
	}

	const categorySearch = await (
		await request.get(`/search?category=${firstCategory.id}&category=${secondCategory.id}`)
	).text();
	expect(categorySearch).toContain('Search titlemarker 단 두글');
	expect(categorySearch).not.toContain('Search subtitle result');
	const tagSearch = await (await request.get('/search?tag=alpha&tag=beta')).text();
	expect(tagSearch).toContain('Search titlemarker 단 두글');
	expect(tagSearch).not.toContain('Search description result');
	const dateSearch = await (await request.get('/search?from=2026-09-10&to=2026-09-10')).text();
	expect(dateSearch).toContain('Search titlemarker 단 두글');
	expect(dateSearch).not.toContain('Search subtitle result');
	const authorSearch = await (await request.get(`/search?author=${username}`)).text();
	expect(authorSearch).toContain('Search body result');

	await sql(
		`INSERT INTO posts
			(asset_id, author_id, title, description, body_markdown, noindex, published_at, created_at, updated_at)
		 SELECT gen_random_uuid()::text, $1, 'Pagingmarker ' || value, 'paging fixture', 'paging fixture', false,
			TIMESTAMPTZ '2026-08-01 00:00:00+00' + value * INTERVAL '1 minute', now(), now()
		 FROM generate_series(1, 22) AS value`,
		[authorId]
	);
	const firstPage = await (await request.get('/search?q=pagingmarker')).text();
	const secondPage = await (await request.get('/search?q=pagingmarker&page=2')).text();
	expect(firstPage).toContain('Pagingmarker 22');
	expect(firstPage).not.toContain('Pagingmarker 1</a>');
	expect(secondPage).toContain('Pagingmarker 1');
	expect(secondPage).not.toContain('Pagingmarker 22');
	expect(firstPage.indexOf('Pagingmarker 22')).toBeLessThan(firstPage.indexOf('Pagingmarker 21'));

	expect(titlePostId).toBeGreaterThan(0);
	expect(bodyPostId).toBeGreaterThan(0);
});
