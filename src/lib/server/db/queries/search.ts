import { and, count, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { afterKoreanDate, startOfKoreanDate } from '$lib/dates';
import { POSTS_PER_PAGE } from '$lib/pagination';
import { user } from '$lib/server/db/schema/auth';
import { posts, series } from '$lib/server/db/schema/content';
import { mapPost, postSummarySelection, publicPostCondition } from './posts';

export type SearchFilters = {
	q: string;
	series: number[];
	categories: number[];
	tags: string[];
	from: string;
	to: string;
	author: string;
};

function repeatedNumbers(url: URL, key: string) {
	return [
		...new Set(
			url.searchParams
				.getAll(key)
				.map(Number)
				.filter((value) => Number.isInteger(value) && value > 0)
		)
	];
}

export function searchFilters(url: URL): SearchFilters {
	return {
		q: (url.searchParams.get('q') ?? '').trim(),
		series: repeatedNumbers(url, 'series'),
		categories: repeatedNumbers(url, 'category'),
		tags: [
			...new Set(
				url.searchParams
					.getAll('tag')
					.flatMap((tag) => tag.split(','))
					.map((tag) => tag.trim())
					.filter(Boolean)
			)
		],
		from: url.searchParams.get('from') ?? '',
		to: url.searchParams.get('to') ?? '',
		author: (url.searchParams.get('author') ?? '').trim()
	};
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

function conditions(filters: SearchFilters, now: Date) {
	const where: SQL[] = [publicPostCondition(now)!];

	if (filters.q) {
		if (Array.from(filters.q).length >= 3) {
			const phrase = `"${filters.q.replaceAll('"', '""')}"`;
			where.push(sql`${posts.id} IN (SELECT rowid FROM posts_fts WHERE posts_fts MATCH ${phrase})`);
		} else {
			const escaped = filters.q
				.replaceAll('\\', '\\\\')
				.replaceAll('%', '\\%')
				.replaceAll('_', '\\_');
			const pattern = `%${escaped}%`;
			where.push(
				sql`(${posts.title} LIKE ${pattern} ESCAPE '\\' OR ${posts.subtitle} LIKE ${pattern} ESCAPE '\\' OR ${posts.description} LIKE ${pattern} ESCAPE '\\')`
			);
		}
	}
	if (filters.series.length) where.push(inArray(posts.seriesId, filters.series));
	if (filters.categories.length) {
		where.push(sql`${posts.id} IN (
			SELECT pc.post_id
			FROM post_categories pc
			WHERE pc.category_id IN (SELECT value FROM json_each(${JSON.stringify(filters.categories)}))
			GROUP BY pc.post_id
			HAVING count(DISTINCT pc.category_id) = ${filters.categories.length}
		)`);
	}
	if (filters.tags.length) {
		where.push(sql`${posts.id} IN (
			SELECT pt.post_id
			FROM post_tags pt
			INNER JOIN tags t ON t.id = pt.tag_id
			WHERE t.name IN (SELECT value FROM json_each(${JSON.stringify(filters.tags)}))
			GROUP BY pt.post_id
			HAVING count(DISTINCT t.name) = ${filters.tags.length}
		)`);
	}
	const from = filters.from ? startOfKoreanDate(filters.from) : null;
	const to = filters.to ? afterKoreanDate(filters.to) : null;
	if (from) where.push(gte(posts.publishedAt, from));
	if (to) where.push(lt(posts.publishedAt, to));
	if (filters.author) where.push(eq(user.username, filters.author));
	return and(...where);
}

export async function searchPosts(
	db: Database,
	filters: SearchFilters,
	page: number,
	now = new Date()
) {
	const where = conditions(filters, now);
	const total = await db
		.select({ value: count() })
		.from(posts)
		.innerJoin(user, eq(user.id, posts.authorId))
		.where(where)
		.get();
	const rows = await db
		.select(postSummarySelection)
		.from(posts)
		.innerJoin(user, eq(user.id, posts.authorId))
		.leftJoin(series, eq(series.id, posts.seriesId))
		.where(where)
		.orderBy(desc(posts.publishedAt), desc(posts.id))
		.limit(POSTS_PER_PAGE)
		.offset((page - 1) * POSTS_PER_PAGE);
	return { total: total?.value ?? 0, items: rows.map(mapPost) };
}
