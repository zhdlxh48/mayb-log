import { startOfKoreanDate } from '$lib/dates';
import {
	MAX_SEARCH_AUTHOR_LENGTH,
	MAX_SEARCH_CATEGORIES,
	MAX_SEARCH_QUERY_LENGTH,
	MAX_SEARCH_SERIES,
	MAX_SEARCH_TAG_LENGTH,
	MAX_SEARCH_TAGS
} from '$lib/limits';

export type SearchFilters = {
	q: string;
	series: number[];
	categories: number[];
	tags: string[];
	from: string;
	to: string;
	author: string;
};

function repeatedNumbers(url: URL, key: string, max: number) {
	const values = url.searchParams.getAll(key).map(Number);
	if (values.some((value) => !Number.isSafeInteger(value) || value <= 0)) return null;
	const unique = [...new Set(values)];
	return unique.length <= max ? unique : null;
}

function length(value: string) {
	return Array.from(value).length;
}

export function searchFilters(url: URL): SearchFilters | null {
	const q = (url.searchParams.get('q') ?? '').trim();
	const series = repeatedNumbers(url, 'series', MAX_SEARCH_SERIES);
	const categories = repeatedNumbers(url, 'category', MAX_SEARCH_CATEGORIES);
	const tags = [
		...new Set(
			url.searchParams
				.getAll('tag')
				.flatMap((tag) => tag.split(','))
				.map((tag) => tag.trim())
				.filter(Boolean)
		)
	];
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const author = (url.searchParams.get('author') ?? '').trim();
	if (
		!series ||
		!categories ||
		length(q) > MAX_SEARCH_QUERY_LENGTH ||
		tags.length > MAX_SEARCH_TAGS ||
		tags.some((tag) => length(tag) > MAX_SEARCH_TAG_LENGTH) ||
		length(author) > MAX_SEARCH_AUTHOR_LENGTH ||
		(from !== '' && !startOfKoreanDate(from)) ||
		(to !== '' && !startOfKoreanDate(to))
	)
		return null;
	return { q, series, categories, tags, from, to, author };
}

export function searchParams(filters: SearchFilters, page?: number) {
	const params = new URLSearchParams();
	if (filters.q) params.set('q', filters.q);
	filters.series.forEach((value) => params.append('series', String(value)));
	filters.categories.forEach((value) => params.append('category', String(value)));
	filters.tags.forEach((value) => params.append('tag', value));
	if (filters.from) params.set('from', filters.from);
	if (filters.to) params.set('to', filters.to);
	if (filters.author) params.set('author', filters.author);
	if (page && page > 1) params.set('page', String(page));
	return params;
}
