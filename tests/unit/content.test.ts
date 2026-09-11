import { describe, expect, it } from 'vitest';
import { afterKoreanDate, parseKoreanDateTimeLocal, startOfKoreanDate } from '$lib/dates';
import { pagination } from '$lib/pagination';
import { renderMarkdown, renderMarkdownDocument } from '$lib/server/markdown/render';
import { listPostImages } from '$lib/server/media/images';
import { postSchema, tagNames } from '$lib/validation/content';
import { MAX_MARKDOWN_BYTES, MAX_PREVIEW_REQUEST_BYTES, MAX_TAGS_INPUT_LENGTH } from '$lib/limits';

describe('Markdown policy', () => {
	it('shows ordinary raw HTML as text', async () => {
		const html = await renderMarkdown('<div>Test</div>');
		expect(html).toContain('div>Test');
		expect(html).not.toContain('<div>');
	});

	it('keeps a safe iframe and removes unsafe attributes', async () => {
		const html = await renderMarkdown(
			'<iframe src="https://example.com/embed" title="Demo" loading="lazy" srcdoc="bad" style="color:red" onload="bad()" allowfullscreen></iframe>'
		);
		expect(html).toContain('<iframe');
		expect(html).toContain('src="https://example.com/embed"');
		expect(html).toContain('title="Demo"');
		expect(html).not.toContain('srcdoc');
		expect(html).not.toContain('style=');
		expect(html).not.toContain('onload');
	});

	it('removes unsafe iframe URLs', async () => {
		const html = await renderMarkdown('<iframe src="javascript:alert(1)"></iframe>');
		expect(html).toBe('<iframe></iframe>');
	});

	it('does not allow an iframe mixed with other raw HTML', async () => {
		const html = await renderMarkdown(
			'<iframe src="https://example.com/embed"></iframe><div>Test</div>'
		);
		expect(html).not.toContain('<iframe');
		expect(html).toContain('iframe src=');
	});

	it('renders the supported note directive through the shared pipeline', async () => {
		const result = await renderMarkdownDocument(':::note{type="warning"}\n**Careful**\n:::');
		expect(result.html).toContain('<aside class="note note-warning">');
		expect(result.html).toContain('<strong>Careful</strong>');
		expect(result.diagnostics).toEqual([]);
	});

	it('shows an invalid note configuration literally with a diagnostic', async () => {
		const source = ':::note{type="banana"}\nWrong type\n:::';
		const result = await renderMarkdownDocument(source);
		expect(result.html).toContain(`<pre><code>${source}\n</code></pre>`);
		expect(result.html).toContain(source);
		expect(result.html).not.toContain('<aside');
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]).toMatchObject({
			line: 1,
			column: 1,
			code: 'directive-attributes',
			message: 'The `note` type must be one of: info, warning, success, error.'
		});
	});

	it('shows the wrong note kind literally with a diagnostic', async () => {
		const source = '::note[Wrong kind]';
		const result = await renderMarkdownDocument(source);
		expect(result.html).toContain(source);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]).toMatchObject({
			code: 'directive-kind',
			message: 'The `note` directive must use container syntax (`:::note`).'
		});
	});

	it('shows an unknown directive literally with a diagnostic', async () => {
		const source = ':::future_widget{foo="bar"}\nContents\n:::';
		const result = await renderMarkdownDocument(source);
		expect(result.html).toContain(source);
		expect(result.html).not.toContain('<future_widget');
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]).toMatchObject({
			code: 'unknown-directive',
			message: 'Unknown directive `future_widget`.'
		});
	});
});

describe('R2 image listing', () => {
	it('follows cursors and keeps only strict UUID v4 image IDs', async () => {
		const assetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
		const firstId = '11111111-1111-4111-8111-111111111111';
		const secondId = '22222222-2222-4222-a222-222222222222';
		const prefix = `posts/${assetId}/`;
		const calls: { prefix?: string; cursor?: string }[] = [];
		const bucket = {
			async list(options: { prefix?: string; cursor?: string }) {
				calls.push(options);
				return options.cursor
					? { objects: [{ key: `${prefix}${secondId}.webp` }], truncated: false }
					: {
							objects: [
								{ key: `${prefix}${firstId}.webp` },
								{ key: `${prefix}33333333-3333-1333-8333-333333333333.webp` },
								{ key: `${prefix}not-a-uuid.webp` }
							],
							truncated: true,
							cursor: 'next'
						};
			}
		} as unknown as R2Bucket;

		expect(await listPostImages(bucket, assetId)).toEqual([
			{ id: firstId, url: `/media/${assetId}/${firstId}.webp` },
			{ id: secondId, url: `/media/${assetId}/${secondId}.webp` }
		]);
		expect(calls).toEqual([{ prefix }, { prefix, cursor: 'next' }]);

		let singlePageCalls = 0;
		await listPostImages(
			{
				async list() {
					singlePageCalls += 1;
					return { objects: [], truncated: false };
				}
			} as unknown as R2Bucket,
			assetId
		);
		expect(singlePageCalls).toBe(1);
	});
});

describe('pagination blocks', () => {
	it('links the current block to adjacent ten-page blocks', () => {
		expect(pagination(3, 500).nextBlock).toBe(11);
		expect(pagination(13, 500)).toMatchObject({ previousBlock: 10, nextBlock: 21 });
	});

	it('always exposes at least one page', () => {
		expect(pagination(99, 0)).toMatchObject({ current: 1, last: 1, pages: [1] });
	});
});

describe('Korean search dates', () => {
	it('uses an inclusive local end date', () => {
		expect(startOfKoreanDate('2026-09-10')?.toISOString()).toBe('2026-09-09T15:00:00.000Z');
		expect(afterKoreanDate('2026-09-10')?.toISOString()).toBe('2026-09-10T15:00:00.000Z');
	});

	it('strictly validates Korean calendar dates and times', () => {
		expect(parseKoreanDateTimeLocal('2026-09-10T08:30')?.toISOString()).toBe(
			'2026-09-09T23:30:00.000Z'
		);
		expect(parseKoreanDateTimeLocal('2024-02-29T23:59')).not.toBeNull();
		for (const value of [
			'2026-02-29T12:00',
			'2026-02-30T12:00',
			'2026-02-31T12:00',
			'2026-00-01T12:00',
			'2026-13-01T12:00',
			'2026-01-01T24:01',
			'2026-01-01T12:60'
		])
			expect(parseKoreanDateTimeLocal(value), value).toBeNull();
		expect(startOfKoreanDate('2026-02-30')).toBeNull();
	});
});

describe('Post input limits', () => {
	const validPost = {
		title: 'Title',
		subtitle: '',
		description: 'Description',
		bodyMarkdown: 'Body',
		seriesId: null,
		seriesPosition: null,
		categories: [],
		tags: '',
		publishedAt: '',
		noindex: false
	};

	it('trims and deduplicates tag names', () => {
		expect(tagNames(' alpha, beta, alpha, , beta ')).toEqual(['alpha', 'beta']);
	});

	it('rejects too many or overly long tags', () => {
		expect(
			postSchema.safeParse({
				...validPost,
				tags: Array.from({ length: 31 }, (_, i) => `t${i}`).join(',')
			}).success
		).toBe(false);
		expect(postSchema.safeParse({ ...validPost, tags: '가'.repeat(65) }).success).toBe(false);
		expect(
			postSchema.safeParse({ ...validPost, tags: ','.repeat(MAX_TAGS_INPUT_LENGTH + 1) }).success
		).toBe(false);
	});

	it('limits Markdown by UTF-8 bytes', () => {
		expect(
			postSchema.safeParse({ ...validPost, bodyMarkdown: 'a'.repeat(MAX_MARKDOWN_BYTES) }).success
		).toBe(true);
		expect(
			postSchema.safeParse({
				...validPost,
				bodyMarkdown: '가'.repeat(Math.floor(MAX_MARKDOWN_BYTES / 3) + 1)
			}).success
		).toBe(false);
	});

	it('allows JSON overhead without increasing the Markdown content limit', () => {
		const bodyMarkdown = '"'.repeat(MAX_MARKDOWN_BYTES);
		const encoder = new TextEncoder();
		expect(encoder.encode(bodyMarkdown).byteLength).toBe(MAX_MARKDOWN_BYTES);
		expect(encoder.encode(JSON.stringify({ bodyMarkdown })).byteLength).toBeLessThan(
			MAX_PREVIEW_REQUEST_BYTES
		);
	});
});
