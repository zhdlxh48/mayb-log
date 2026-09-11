import { describe, expect, it } from 'vitest';
import { afterKoreanDate, parseKoreanDateTimeLocal, startOfKoreanDate } from '$lib/dates';
import { pagination } from '$lib/pagination';
import { renderMarkdown } from '$lib/server/markdown/render';
import { postSchema, tagNames } from '$lib/validation/content';
import { MAX_MARKDOWN_BYTES } from '$lib/limits';

describe('Markdown policy', () => {
	it('shows ordinary raw HTML as text', async () => {
		const html = await renderMarkdown('<div>Test</div>');
		expect(html).toContain('div>Test');
		expect(html).not.toContain('<div>');
	});

	it('keeps a safe iframe and removes unsafe attributes', async () => {
		const html = await renderMarkdown(
			'<iframe src="https://example.com/embed" title="Demo" loading="lazy" srcdoc="bad" onload="bad()" allowfullscreen></iframe>'
		);
		expect(html).toContain('<iframe');
		expect(html).toContain('src="https://example.com/embed"');
		expect(html).toContain('title="Demo"');
		expect(html).not.toContain('srcdoc');
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
		const html = await renderMarkdown(':::note{type="warning"}\n**Careful**\n:::');
		expect(html).toContain('<aside class="note note-warning">');
		expect(html).toContain('<strong>Careful</strong>');
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
});
