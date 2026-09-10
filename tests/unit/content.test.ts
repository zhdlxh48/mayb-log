import { describe, expect, it } from 'vitest';
import { afterKoreanDate, startOfKoreanDate } from '$lib/dates';
import { pagination } from '$lib/pagination';
import { renderMarkdown } from '$lib/server/markdown/render';

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
});
