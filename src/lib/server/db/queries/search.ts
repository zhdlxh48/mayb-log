import { and, count, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { afterKoreanDate, startOfKoreanDate } from '$lib/dates';
import { POSTS_PER_PAGE } from '$lib/pagination';
import type { SearchFilters } from '$lib/search';
import type { Database } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { posts, series } from '$lib/server/db/schema/content';
import { mapPost, postSummarySelection, publicPostCondition } from './posts/read';

function conditions(filters: SearchFilters, now: Date, authorId?: string) {
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
			WHERE pt.tag IN (SELECT value FROM json_each(${JSON.stringify(filters.tags)}))
			GROUP BY pt.post_id
			HAVING count(DISTINCT pt.tag) = ${filters.tags.length}
		)`);
	}
	const from = filters.from ? startOfKoreanDate(filters.from) : null;
	const to = filters.to ? afterKoreanDate(filters.to) : null;
	if (from) where.push(gte(posts.publishedAt, from));
	if (to) where.push(lt(posts.publishedAt, to));
	if (authorId) where.push(eq(posts.authorId, authorId));
	return and(...where);
}

export async function countSearchPosts(db: Database, filters: SearchFilters, now = new Date()) {
	const author = filters.author
		? await db.select({ id: user.id }).from(user).where(eq(user.username, filters.author)).get()
		: null;
	if (filters.author && !author) return { total: 0, authorId: null };
	const where = conditions(filters, now, author?.id);
	const total = await db.select({ value: count() }).from(posts).where(where).get();
	return { total: total?.value ?? 0, authorId: author?.id ?? null };
}

export async function searchPosts(
	db: Database,
	filters: SearchFilters,
	page: number,
	authorId: string | null,
	now = new Date()
) {
	if (filters.author && !authorId) return [];
	const where = conditions(filters, now, authorId ?? undefined);
	const rows = await db
		.select(postSummarySelection)
		.from(posts)
		.innerJoin(user, eq(user.id, posts.authorId))
		.leftJoin(series, eq(series.id, posts.seriesId))
		.where(where)
		.orderBy(desc(posts.publishedAt), desc(posts.id))
		.limit(POSTS_PER_PAGE)
		.offset((page - 1) * POSTS_PER_PAGE);
	return rows.map(mapPost);
}
