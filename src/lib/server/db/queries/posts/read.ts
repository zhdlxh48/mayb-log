import { and, asc, count, desc, eq, gt, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { POSTS_PER_PAGE } from '$lib/pagination';
import type { Database } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { categories, postCategories, posts, postTags, series } from '$lib/server/db/schema/content';

const categoryNames = sql<string[]>`COALESCE((
	SELECT json_agg(${categories.name} ORDER BY ${categories.name})
	FROM ${postCategories}
	INNER JOIN ${categories} ON ${categories.id} = ${postCategories.categoryId}
	WHERE ${postCategories.postId} = ${posts.id}
), '[]'::json)`;

const joinedTagNames = sql<string[]>`COALESCE((
	SELECT json_agg(${postTags.tag} ORDER BY ${postTags.tag})
	FROM ${postTags}
	WHERE ${postTags.postId} = ${posts.id}
), '[]'::json)`;

const categoryIds = sql<number[]>`COALESCE((
	SELECT json_agg(${postCategories.categoryId} ORDER BY ${postCategories.categoryId})
	FROM ${postCategories}
	WHERE ${postCategories.postId} = ${posts.id}
), '[]'::json)`;

export const postSummarySelection = {
	id: posts.id,
	title: posts.title,
	description: posts.description,
	publishedAt: posts.publishedAt,
	authorId: posts.authorId,
	authorName: user.name,
	authorUsername: user.username,
	seriesTitle: series.title,
	categories: categoryNames,
	tags: joinedTagNames
};

const postDetailSelection = {
	...postSummarySelection,
	subtitle: posts.subtitle,
	bodyMarkdown: posts.bodyMarkdown,
	seriesId: posts.seriesId,
	seriesPosition: posts.seriesPosition,
	noindex: posts.noindex,
	updatedAt: posts.updatedAt
};

const postEditorSelection = {
	id: posts.id,
	assetId: posts.assetId,
	title: posts.title,
	subtitle: posts.subtitle,
	description: posts.description,
	bodyMarkdown: posts.bodyMarkdown,
	seriesId: posts.seriesId,
	seriesPosition: posts.seriesPosition,
	noindex: posts.noindex,
	publishedAt: posts.publishedAt,
	updatedAt: posts.updatedAt,
	categoryIds,
	tags: joinedTagNames
};

export type Post = NonNullable<Awaited<ReturnType<typeof getPublishedPost>>>;

export function publicPostCondition(now = new Date()) {
	return and(isNotNull(posts.publishedAt), lte(posts.publishedAt, now));
}

function selectSummaries(db: Database) {
	return db
		.select(postSummarySelection)
		.from(posts)
		.innerJoin(user, eq(user.id, posts.authorId))
		.leftJoin(series, eq(series.id, posts.seriesId));
}

export async function countPublishedPosts(db: Database, now = new Date()) {
	const [total] = await db.select({ value: count() }).from(posts).where(publicPostCondition(now));
	return total?.value ?? 0;
}

export async function getPublishedPostPage(db: Database, page: number, now = new Date()) {
	const rows = await selectSummaries(db)
		.where(publicPostCondition(now))
		.orderBy(desc(posts.publishedAt), desc(posts.id))
		.limit(POSTS_PER_PAGE)
		.offset((page - 1) * POSTS_PER_PAGE);
	return rows;
}

export async function getPublishedPost(db: Database, id: number, now = new Date()) {
	const [row] = await db
		.select(postDetailSelection)
		.from(posts)
		.innerJoin(user, eq(user.id, posts.authorId))
		.leftJoin(series, eq(series.id, posts.seriesId))
		.where(and(eq(posts.id, id), publicPostCondition(now)))
		.limit(1);
	return row ?? null;
}

export async function getEditablePost(db: Database, id: number) {
	const [row] = await db.select(postEditorSelection).from(posts).where(eq(posts.id, id)).limit(1);
	return row ?? null;
}

export async function getDrafts(db: Database, now = new Date()) {
	return db
		.select({
			id: posts.id,
			title: posts.title,
			publishedAt: posts.publishedAt,
			updatedAt: posts.updatedAt
		})
		.from(posts)
		.where(or(isNull(posts.publishedAt), gt(posts.publishedAt, now)))
		.orderBy(desc(posts.updatedAt));
}

export async function getSeriesNeighbors(db: Database, post: Post) {
	if (!post.seriesId || post.seriesPosition === null) return { previous: null, next: null };
	const condition = publicPostCondition();
	const [previousRows, nextRows] = await Promise.all([
		db
			.select({ id: posts.id, title: posts.title })
			.from(posts)
			.where(
				and(
					eq(posts.seriesId, post.seriesId),
					sql`${posts.seriesPosition} < ${post.seriesPosition}`,
					condition
				)
			)
			.orderBy(desc(posts.seriesPosition))
			.limit(1),
		db
			.select({ id: posts.id, title: posts.title })
			.from(posts)
			.where(
				and(
					eq(posts.seriesId, post.seriesId),
					sql`${posts.seriesPosition} > ${post.seriesPosition}`,
					condition
				)
			)
			.orderBy(asc(posts.seriesPosition))
			.limit(1)
	]);
	return { previous: previousRows[0] ?? null, next: nextRows[0] ?? null };
}

export async function getFeedPosts(db: Database, now = new Date()) {
	return db
		.select({
			id: posts.id,
			title: posts.title,
			description: posts.description,
			bodyMarkdown: posts.bodyMarkdown,
			authorName: user.name,
			publishedAt: posts.publishedAt,
			updatedAt: posts.updatedAt
		})
		.from(posts)
		.innerJoin(user, eq(user.id, posts.authorId))
		.where(publicPostCondition(now))
		.orderBy(desc(posts.publishedAt), desc(posts.id))
		.limit(30);
}

export async function getSitemapPosts(db: Database, now = new Date()) {
	return db
		.select({ id: posts.id, updatedAt: posts.updatedAt })
		.from(posts)
		.where(and(publicPostCondition(now), eq(posts.noindex, false)))
		.orderBy(desc(posts.publishedAt), desc(posts.id));
}
