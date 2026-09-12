import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { categories, posts, series } from '$lib/server/db/schema/content';

export async function saveSeries(
	db: Database,
	value: { title: string; description: string },
	id?: number
) {
	if (id !== undefined)
		return db.update(series).set(value).where(eq(series.id, id)).returning({ id: series.id }).get();
	return db.insert(series).values(value).returning({ id: series.id }).get();
}

export async function removeSeries(db: Database, id: number) {
	const [, removed] = await db.batch([
		db.update(posts).set({ seriesId: null, seriesPosition: null }).where(eq(posts.seriesId, id)),
		db.delete(series).where(eq(series.id, id)).returning({ id: series.id })
	]);
	return (removed as { id: number }[])[0] ?? null;
}

export async function saveCategory(
	db: Database,
	value: { name: string; description: string },
	id?: number
) {
	if (id !== undefined)
		return db
			.update(categories)
			.set(value)
			.where(eq(categories.id, id))
			.returning({ id: categories.id })
			.get();
	return db.insert(categories).values(value).returning({ id: categories.id }).get();
}

export async function removeCategory(db: Database, id: number) {
	return db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id }).get();
}
