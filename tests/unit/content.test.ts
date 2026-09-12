import { describe, expect, it } from 'vitest';
import { afterKoreanDate, parseKoreanDateTimeLocal, startOfKoreanDate } from '$lib/dates';
import { pagination, requestedPage } from '$lib/pagination';
import { positiveIntegerParam } from '$lib/params';
import { searchFilters } from '$lib/search';
import { postSchema, tagNames } from '$lib/validation/content';
import { MAX_MARKDOWN_BYTES, MAX_PREVIEW_REQUEST_BYTES, MAX_TAGS_INPUT_LENGTH } from '$lib/limits';

describe('pagination blocks', () => {
	it('links the current block to adjacent ten-page blocks', () => {
		expect(pagination(3, 500).nextBlock).toBe(11);
		expect(pagination(13, 500)).toMatchObject({ previousBlock: 10, nextBlock: 21 });
	});

	it('always exposes at least one page', () => {
		expect(pagination(99, 0)).toMatchObject({ current: 1, last: 1, pages: [1] });
	});

	it('accepts only safe positive page numbers', () => {
		expect(requestedPage(null)).toBe(1);
		expect(requestedPage('1')).toBe(1);
		expect(requestedPage('42')).toBe(42);
		for (const value of ['0', '-1', '1.5', 'abc', '9007199254740992'])
			expect(requestedPage(value), value).toBe(1);
	});
});

describe('numeric route parameters', () => {
	it('accepts only safe positive integers', () => {
		expect(positiveIntegerParam('1')).toBe(1);
		expect(positiveIntegerParam('42')).toBe(42);
		for (const value of ['0', '-1', '1.5', 'abc', '9007199254740992'])
			expect(positiveIntegerParam(value), value).toBeNull();
	});

	it('rejects unsafe repeated search IDs', () => {
		expect(searchFilters(new URL('https://example.com/search?series=1&category=2'))).not.toBeNull();
		for (const query of ['series=9007199254740992', 'category=1.5', 'series=0'])
			expect(searchFilters(new URL(`https://example.com/search?${query}`)), query).toBeNull();
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
