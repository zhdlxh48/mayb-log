import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	inArray,
	isNotNull,
	isNull,
	lte,
	or,
	sql
} from 'drizzle-orm';
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

const categoryNames = sql<string>`COALESCE((SELECT json_group_array(name) FROM (
	SELECT ${categories.name} AS name FROM ${postCategories}
	INNER JOIN ${categories} ON ${categories.id} = ${postCategories.categoryId}
	WHERE ${postCategories.postId} = ${posts.id} ORDER BY ${categories.name}
)), '[]')`;

const joinedTagNames = sql<string>`COALESCE((SELECT json_group_array(name) FROM (
	SELECT ${tags.name} AS name FROM ${postTags}
	INNER JOIN ${tags} ON ${tags.id} = ${postTags.tagId}
	WHERE ${postTags.postId} = ${posts.id} ORDER BY ${tags.name}
)), '[]')`;

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
	categories: categoryNames,
	tags: joinedTagNames
};

export type Post = NonNullable<Awaited<ReturnType<typeof getPublishedPost>>>;

function parseNames(value: string) {
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed)
			? parsed.filter((name): name is string => typeof name === 'string')
			: [];
	} catch {
		return [];
	}
}

export function mapPost<T extends { categories: string; tags: string }>(post: T) {
	return { ...post, categories: parseNames(post.categories), tags: parseNames(post.tags) };
}

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

export async function getPublishedPosts(db: Database, page: number, now = new Date()) {
	const condition = publicPostCondition(now);
	const total = await db.select({ value: count() }).from(posts).where(condition).get();
	const rows = await selectSummaries(db)
		.where(condition)
		.orderBy(desc(posts.publishedAt), desc(posts.id))
		.limit(POSTS_PER_PAGE)
		.offset((page - 1) * POSTS_PER_PAGE);
	return { total: total?.value ?? 0, items: rows.map(mapPost) };
}

export async function getPublishedPost(db: Database, id: number, now = new Date()) {
	const row = await db
		.select(postDetailSelection)
		.from(posts)
		.innerJoin(user, eq(user.id, posts.authorId))
		.leftJoin(series, eq(series.id, posts.seriesId))
		.where(and(eq(posts.id, id), publicPostCondition(now)))
		.get();
	return row ? mapPost(row) : null;
}

export async function getEditablePost(db: Database, id: number) {
	const row = await db.select(postEditorSelection).from(posts).where(eq(posts.id, id)).get();
	return row ? mapPost(row) : null;
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

export type PublicationAction = 'saveDraft' | 'publish' | 'save' | 'moveToDraft';

function publication(value: string, action: PublicationAction) {
	if (action === 'saveDraft' || action === 'moveToDraft') return null;
	if (!value) return new Date();
	const date = new Date(`${value}:00+09:00`);
	return Number.isNaN(date.getTime()) ? null : date;
}

function postValues(input: PostInput, action: PublicationAction) {
	return {
		title: input.title,
		subtitle: input.subtitle || null,
		description: input.description,
		bodyMarkdown: input.bodyMarkdown,
		seriesId: input.seriesId,
		seriesPosition: input.seriesId ? input.seriesPosition : null,
		noindex: input.noindex,
		publishedAt: publication(input.publishedAt, action),
		updatedAt: new Date()
	};
}

async function relationsFor(db: Database, categoryIds: number[], rawTags: string) {
	const uniqueCategoryIds = [...new Set(categoryIds)];
	const validCategories = uniqueCategoryIds.length
		? await db
				.select({ id: categories.id })
				.from(categories)
				.where(inArray(categories.id, uniqueCategoryIds))
		: [];
	const names = tagNames(rawTags);
	if (names.length)
		await db
			.insert(tags)
			.values(names.map((name) => ({ name })))
			.onConflictDoNothing();
	const savedTags = names.length
		? await db.select({ id: tags.id }).from(tags).where(inArray(tags.name, names))
		: [];
	return {
		categoryIds: validCategories.map(({ id }) => id),
		tagIds: savedTags.map(({ id }) => id)
	};
}

function relationStatements(
	db: Database,
	postId: number,
	relations: { categoryIds: number[]; tagIds: number[] }
) {
	return [
		db.delete(postCategories).where(eq(postCategories.postId, postId)),
		db.delete(postTags).where(eq(postTags.postId, postId)),
		...(relations.categoryIds.length
			? [
					db
						.insert(postCategories)
						.values(relations.categoryIds.map((categoryId) => ({ postId, categoryId })))
				]
			: []),
		...(relations.tagIds.length
			? [db.insert(postTags).values(relations.tagIds.map((tagId) => ({ postId, tagId })))]
			: [])
	];
}

export async function createPost(
	db: Database,
	input: PostInput,
	authorId: string,
	assetId: string,
	action: 'saveDraft' | 'publish'
) {
	const relations = await relationsFor(db, input.categories, input.tags);
	const now = new Date();
	const created = await db
		.insert(posts)
		.values({ ...postValues(input, action), authorId, assetId, createdAt: now, updatedAt: now })
		.returning({ id: posts.id })
		.get();
	try {
		await db.batch(
			relationStatements(db, created.id, relations) as unknown as Parameters<Database['batch']>[0]
		);
	} catch (cause) {
		await db.delete(posts).where(eq(posts.id, created.id));
		throw cause;
	}
	return { id: created.id, publishedAt: publication(input.publishedAt, action) };
}

export async function updatePost(
	db: Database,
	id: number,
	input: PostInput,
	action: PublicationAction
) {
	const relations = await relationsFor(db, input.categories, input.tags);
	const update = db
		.update(posts)
		.set(postValues(input, action))
		.where(eq(posts.id, id))
		.returning({ id: posts.id });
	const [updated] = await db.batch([update, ...relationStatements(db, id, relations)] as Parameters<
		Database['batch']
	>[0]);
	if (!(updated as { id: number }[]).length) return null;
	return { id, publishedAt: publication(input.publishedAt, action) };
}

export async function deletePost(db: Database, id: number) {
	return (await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id }).get()) ?? null;
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
