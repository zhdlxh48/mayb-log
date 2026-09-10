import { and, asc, count, desc, eq, gt, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import {
	categories,
	postCategories,
	posts,
	postTags,
	series,
	tags
} from '$lib/server/db/schema/content';
import { POSTS_PER_PAGE } from '$lib/pagination';
import { tagNames } from '$lib/validation/content';

const categoryNames = sql<string>`COALESCE((
	SELECT group_concat(name, char(31)) FROM (
		SELECT ${categories.name} AS name
		FROM ${postCategories}
		INNER JOIN ${categories} ON ${categories.id} = ${postCategories.categoryId}
		WHERE ${postCategories.postId} = ${posts.id}
		ORDER BY ${categories.name}
	)
), '')`;

const joinedTagNames = sql<string>`COALESCE((
	SELECT group_concat(name, char(31)) FROM (
		SELECT ${tags.name} AS name
		FROM ${postTags}
		INNER JOIN ${tags} ON ${tags.id} = ${postTags.tagId}
		WHERE ${postTags.postId} = ${posts.id}
		ORDER BY ${tags.name}
	)
), '')`;

export const postSelection = {
	id: posts.id,
	title: posts.title,
	subtitle: posts.subtitle,
	description: posts.description,
	bodyMarkdown: posts.bodyMarkdown,
	seriesId: posts.seriesId,
	seriesPosition: posts.seriesPosition,
	draft: posts.draft,
	noindex: posts.noindex,
	publishedAt: posts.publishedAt,
	createdAt: posts.createdAt,
	updatedAt: posts.updatedAt,
	authorId: posts.authorId,
	authorName: user.name,
	seriesTitle: series.title,
	categories: categoryNames,
	tags: joinedTagNames
};

export type Post = Awaited<ReturnType<typeof getEditablePost>>;

function split(value: string) {
	return value ? value.split(String.fromCharCode(31)) : [];
}

export function mapPost<T extends { categories: string; tags: string }>(post: T) {
	return { ...post, categories: split(post.categories), tags: split(post.tags) };
}

export function publicPostCondition(now = new Date()) {
	return and(eq(posts.draft, false), isNotNull(posts.publishedAt), lte(posts.publishedAt, now));
}

function selectPosts(db: Database) {
	return db
		.select(postSelection)
		.from(posts)
		.innerJoin(user, eq(user.id, posts.authorId))
		.leftJoin(series, eq(series.id, posts.seriesId));
}

export async function getPublishedPosts(db: Database, page: number, now = new Date()) {
	const condition = publicPostCondition(now);
	const total = await db.select({ value: count() }).from(posts).where(condition).get();
	const items = await selectPosts(db)
		.where(condition)
		.orderBy(desc(posts.publishedAt), desc(posts.id))
		.limit(POSTS_PER_PAGE)
		.offset((page - 1) * POSTS_PER_PAGE);
	return { total: total?.value ?? 0, items: items.map(mapPost) };
}

export async function getPublishedPost(db: Database, id: number, now = new Date()) {
	const row = await selectPosts(db)
		.where(and(eq(posts.id, id), publicPostCondition(now)))
		.get();
	return row ? mapPost(row) : null;
}

export async function getEditablePost(db: Database, id: number) {
	const row = await selectPosts(db).where(eq(posts.id, id)).get();
	return row ? mapPost(row) : null;
}

export async function getDrafts(db: Database, now = new Date()) {
	const rows = await selectPosts(db)
		.where(or(eq(posts.draft, true), gt(posts.publishedAt, now)))
		.orderBy(desc(posts.updatedAt));
	return rows.map(mapPost);
}

export async function getSeriesNeighbors(db: Database, post: NonNullable<Post>) {
	if (!post.seriesId || post.seriesPosition === null) return { previous: null, next: null };
	const condition = publicPostCondition();
	const [previous, next] = await Promise.all([
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
			.limit(1)
			.get(),
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
			.get()
	]);
	return { previous: previous ?? null, next: next ?? null };
}

export type PostInput = {
	title: string;
	subtitle: string;
	description: string;
	bodyMarkdown: string;
	seriesId: number | null;
	seriesPosition: number | null;
	categories: number[];
	tags: string;
	publishedAt: string;
	noindex: boolean;
};

function publication(value: string, publish: boolean) {
	if (!value) return publish ? new Date() : null;
	const date = new Date(`${value}:00+09:00`);
	return Number.isNaN(date.getTime()) ? null : date;
}

function values(input: PostInput, draft: boolean, authorId?: string) {
	const now = new Date();
	return {
		...(authorId ? { authorId } : {}),
		title: input.title,
		subtitle: input.subtitle || null,
		description: input.description,
		bodyMarkdown: input.bodyMarkdown,
		seriesId: input.seriesId,
		seriesPosition: input.seriesId ? input.seriesPosition : null,
		draft,
		noindex: input.noindex,
		publishedAt: publication(input.publishedAt, !draft),
		updatedAt: now,
		...(authorId ? { createdAt: now } : {})
	};
}

async function syncTerms(db: Database, postId: number, categoryIds: number[], rawTags: string) {
	await db.delete(postCategories).where(eq(postCategories.postId, postId));
	await db.delete(postTags).where(eq(postTags.postId, postId));

	const validCategories = categoryIds.length
		? await db
				.select({ id: categories.id })
				.from(categories)
				.where(inArray(categories.id, categoryIds))
		: [];
	for (const category of validCategories) {
		await db.insert(postCategories).values({ postId, categoryId: category.id });
	}

	for (const name of tagNames(rawTags)) {
		await db.insert(tags).values({ name }).onConflictDoNothing();
		const tag = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
		if (tag) await db.insert(postTags).values({ postId, tagId: tag.id });
	}
}

export async function createPost(db: Database, input: PostInput, authorId: string, draft: boolean) {
	const created = await db
		.insert(posts)
		.values(values(input, draft, authorId) as typeof posts.$inferInsert)
		.returning({ id: posts.id })
		.get();
	await syncTerms(db, created.id, input.categories, input.tags);
	return created.id;
}

export async function updatePost(db: Database, id: number, input: PostInput, draft: boolean) {
	await db
		.update(posts)
		.set(values(input, draft) as Partial<typeof posts.$inferInsert>)
		.where(eq(posts.id, id));
	await syncTerms(db, id, input.categories, input.tags);
}

export async function deletePost(db: Database, id: number) {
	await db.delete(posts).where(eq(posts.id, id));
}

export async function getFeedPosts(db: Database, now = new Date()) {
	const rows = await selectPosts(db)
		.where(publicPostCondition(now))
		.orderBy(desc(posts.publishedAt), desc(posts.id));
	return rows.map(mapPost);
}
