import { and, count, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { afterKoreanDate, startOfKoreanDate } from '$lib/dates';
import { POSTS_PER_PAGE } from '$lib/pagination';
import type { SearchFilters } from '$lib/search';
import type { Database } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { postCategories, posts, postTags, series } from '$lib/server/db/schema/content';
import { mapPost, postSummarySelection, publicPostCondition } from './posts/read';

function escapedPattern(value: string) {
	return `%${value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
}

function conditions(filters: SearchFilters, now: Date, authorId?: string) {
	const where: SQL[] = [publicPostCondition(now)!];

	if (filters.q) {
		const pattern = escapedPattern(filters.q);
		if (Array.from(filters.q).length >= 3) {
			where.push(
				sql`(${posts.title} || ' ' || coalesce(${posts.subtitle}, '') || ' ' || ${posts.description} || ' ' || ${posts.bodyMarkdown}) ILIKE ${pattern} ESCAPE '\\'`
			);
		} else {
			where.push(
				sql`(${posts.title} ILIKE ${pattern} ESCAPE '\\' OR ${posts.subtitle} ILIKE ${pattern} ESCAPE '\\' OR ${posts.description} ILIKE ${pattern} ESCAPE '\\')`
			);
		}
	}
	if (filters.series.length) where.push(inArray(posts.seriesId, filters.series));
	if (filters.categories.length) {
		where.push(sql`${posts.id} IN (
			SELECT ${postCategories.postId}
			FROM ${postCategories}
			WHERE ${postCategories.categoryId} IN (${sql.join(
				filters.categories.map((value) => sql`${value}`),
				sql`, `
			)})
			GROUP BY ${postCategories.postId}
			HAVING count(DISTINCT ${postCategories.categoryId}) = ${filters.categories.length}
		)`);
	}
	if (filters.tags.length) {
		where.push(sql`${posts.id} IN (
			SELECT ${postTags.postId}
			FROM ${postTags}
			WHERE ${postTags.tag} IN (${sql.join(
				filters.tags.map((value) => sql`${value}`),
				sql`, `
			)})
			GROUP BY ${postTags.postId}
			HAVING count(DISTINCT ${postTags.tag}) = ${filters.tags.length}
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
	const [author] = filters.author
		? await db.select({ id: user.id }).from(user).where(eq(user.username, filters.author)).limit(1)
		: [];
	if (filters.author && !author) return { total: 0, authorId: null };
	const where = conditions(filters, now, author?.id);
	const [total] = await db.select({ value: count() }).from(posts).where(where);
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
