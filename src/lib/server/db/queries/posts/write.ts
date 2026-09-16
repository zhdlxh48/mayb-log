import { eq } from 'drizzle-orm';
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

async function replaceRelations(db: Pick<Database, 'insert'>, postId: number, input: PostInput) {
	const categoryIds = [...new Set(input.categories)];
	const tags = tagNames(input.tags);
	if (categoryIds.length)
		await db
			.insert(postCategories)
			.values(categoryIds.map((categoryId) => ({ postId, categoryId })));
	if (tags.length) await db.insert(postTags).values(tags.map((tag) => ({ postId, tag })));
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
	return db.transaction(async (tx) => {
		const [created] = await tx
			.insert(posts)
			.values({
				...postValues(input, action, publishedAt),
				authorId,
				assetId,
				createdAt: now,
				updatedAt: now
			})
			.returning({ id: posts.id });
		await replaceRelations(tx, created.id, input);
		return { id: created.id, publishedAt };
	});
}

export async function updatePost(
	db: Database,
	id: number,
	input: PostInput,
	action: PublicationAction
) {
	const publishedAt = publication(input.publishedAt, action);
	return db.transaction(async (tx) => {
		const [updated] = await tx
			.update(posts)
			.set(postValues(input, action, publishedAt))
			.where(eq(posts.id, id))
			.returning({ id: posts.id });
		if (!updated) return null;
		await tx.delete(postCategories).where(eq(postCategories.postId, id));
		await tx.delete(postTags).where(eq(postTags.postId, id));
		await replaceRelations(tx, id, input);
		return { id, publishedAt };
	});
}

export async function deletePost(db: Database, id: number) {
	const [removed] = await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
	return removed ?? null;
}
