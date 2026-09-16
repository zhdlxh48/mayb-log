import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { categories, posts, series } from '$lib/server/db/schema/content';

export async function saveSeries(
	db: Database,
	value: { title: string; description: string },
	id?: number
) {
	const [saved] =
		id !== undefined
			? await db.update(series).set(value).where(eq(series.id, id)).returning({ id: series.id })
			: await db.insert(series).values(value).returning({ id: series.id });
	return saved ?? null;
}

export async function removeSeries(db: Database, id: number) {
	return db.transaction(async (tx) => {
		await tx
			.update(posts)
			.set({ seriesId: null, seriesPosition: null })
			.where(eq(posts.seriesId, id));
		const [removed] = await tx.delete(series).where(eq(series.id, id)).returning({ id: series.id });
		return removed ?? null;
	});
}

export async function saveCategory(
	db: Database,
	value: { name: string; description: string },
	id?: number
) {
	const [saved] =
		id !== undefined
			? await db
					.update(categories)
					.set(value)
					.where(eq(categories.id, id))
					.returning({ id: categories.id })
			: await db.insert(categories).values(value).returning({ id: categories.id });
	return saved ?? null;
}

export async function removeCategory(db: Database, id: number) {
	const [removed] = await db
		.delete(categories)
		.where(eq(categories.id, id))
		.returning({ id: categories.id });
	return removed ?? null;
}
