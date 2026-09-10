import { and, count, eq, isNotNull, lte, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { categories, postCategories, posts, series } from '$lib/server/db/schema/content';

const publicNow = () =>
	and(eq(posts.draft, false), isNotNull(posts.publishedAt), lte(posts.publishedAt, new Date()));

export async function getSeriesList(db: Database) {
	return db
		.select({
			id: series.id,
			title: series.title,
			description: series.description,
			count: count(posts.id)
		})
		.from(series)
		.leftJoin(posts, and(eq(posts.seriesId, series.id), publicNow()))
		.groupBy(series.id)
		.orderBy(series.title);
}

export async function getCategoryList(db: Database) {
	return db
		.select({
			id: categories.id,
			name: categories.name,
			description: categories.description,
			count: sql<number>`count(${posts.id})`
		})
		.from(categories)
		.leftJoin(postCategories, eq(postCategories.categoryId, categories.id))
		.leftJoin(posts, and(eq(posts.id, postCategories.postId), publicNow()))
		.groupBy(categories.id)
		.orderBy(categories.name);
}

export async function getPostOptions(db: Database) {
	const [allSeries, allCategories] = await Promise.all([
		db.select({ id: series.id, title: series.title }).from(series).orderBy(series.title),
		db
			.select({ id: categories.id, name: categories.name })
			.from(categories)
			.orderBy(categories.name)
	]);
	return { series: allSeries, categories: allCategories };
}

export async function getSeries(db: Database, id: number) {
	return (await db.select().from(series).where(eq(series.id, id)).get()) ?? null;
}

export async function saveSeries(
	db: Database,
	value: { title: string; description: string },
	id?: number
) {
	const now = new Date();
	if (id)
		return db
			.update(series)
			.set({ ...value, updatedAt: now })
			.where(eq(series.id, id));
	return db.insert(series).values({ ...value, createdAt: now, updatedAt: now });
}

export async function removeSeries(db: Database, id: number) {
	await db.delete(series).where(eq(series.id, id));
}

export async function getCategory(db: Database, id: number) {
	return (await db.select().from(categories).where(eq(categories.id, id)).get()) ?? null;
}

export async function saveCategory(
	db: Database,
	value: { name: string; description: string },
	id?: number
) {
	const now = new Date();
	if (id)
		return db
			.update(categories)
			.set({ ...value, updatedAt: now })
			.where(eq(categories.id, id));
	return db.insert(categories).values({ ...value, createdAt: now, updatedAt: now });
}

export async function removeCategory(db: Database, id: number) {
	await db.delete(categories).where(eq(categories.id, id));
}
