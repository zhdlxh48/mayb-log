import { eq, sql } from 'drizzle-orm';
import { parseKoreanDateTimeLocal } from '$lib/dates';
import type { Database } from '$lib/server/db';
import { postCategories, posts, postTags } from '$lib/server/db/schema/content';
import { tagNames } from '$lib/validation/content';

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
	const date = parseKoreanDateTimeLocal(value);
	if (!date) throw new Error('publishedAt passed validation but could not be parsed');
	return date;
}

function postValues(
	input: PostInput,
	action: PublicationAction,
	publishedAt = publication(input.publishedAt, action)
) {
	return {
		title: input.title,
		subtitle: input.subtitle || null,
		description: input.description,
		bodyMarkdown: input.bodyMarkdown,
		seriesId: input.seriesId,
		seriesPosition: input.seriesId ? input.seriesPosition : null,
		noindex: input.noindex,
		publishedAt,
		updatedAt: new Date()
	};
}

function relationStatements(
	db: Database,
	where: { id: number } | { assetId: string },
	input: PostInput
) {
	const categoryIds = [...new Set(input.categories)];
	const tags = tagNames(input.tags);
	const postCondition = 'id' in where ? eq(posts.id, where.id) : eq(posts.assetId, where.assetId);
	return [
		db
			.insert(postCategories)
			.select(
				sql`SELECT ${posts.id}, value FROM ${posts}, json_each(${JSON.stringify(categoryIds)}) WHERE ${postCondition}`
			),
		db
			.insert(postTags)
			.select(
				sql`SELECT ${posts.id}, value FROM ${posts}, json_each(${JSON.stringify(tags)}) WHERE ${postCondition}`
			)
	];
}

export async function createPost(
	db: Database,
	input: PostInput,
	authorId: string,
	assetId: string,
	action: 'saveDraft' | 'publish'
) {
	const now = new Date();
	const publishedAt = publication(input.publishedAt, action);
	const insert = db
		.insert(posts)
		.values({
			...postValues(input, action, publishedAt),
			authorId,
			assetId,
			createdAt: now,
			updatedAt: now
		})
		.returning({ id: posts.id });
	const [created] = await db.batch([
		insert,
		...relationStatements(db, { assetId }, input)
	] as Parameters<Database['batch']>[0]);
	return { id: (created as { id: number }[])[0].id, publishedAt };
}

export async function updatePost(
	db: Database,
	id: number,
	input: PostInput,
	action: PublicationAction
) {
	const publishedAt = publication(input.publishedAt, action);
	const update = db
		.update(posts)
		.set(postValues(input, action, publishedAt))
		.where(eq(posts.id, id))
		.returning({ id: posts.id });
	const [updated] = await db.batch([
		update,
		db.delete(postCategories).where(eq(postCategories.postId, id)),
		db.delete(postTags).where(eq(postTags.postId, id)),
		...relationStatements(db, { id }, input)
	] as Parameters<Database['batch']>[0]);
	if (!(updated as { id: number }[]).length) return null;
	return { id, publishedAt };
}

export async function deletePost(db: Database, id: number) {
	return (await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id }).get()) ?? null;
}
