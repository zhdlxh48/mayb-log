import { and, count, eq, isNotNull, lte, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { categories, postCategories, posts, series } from '$lib/server/db/schema/content';

const publicNow = () => and(isNotNull(posts.publishedAt), lte(posts.publishedAt, new Date()));

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

export async function getEditorOptions(db: Database) {
	const [allSeries, allCategories] = await Promise.all([
		db.select({ id: series.id, title: series.title }).from(series).orderBy(series.title),
		db
			.select({ id: categories.id, name: categories.name })
			.from(categories)
			.orderBy(categories.name)
	]);
	return { series: allSeries, categories: allCategories };
}

export async function getSearchOptions(db: Database) {
	const [options, authors] = await Promise.all([
		getEditorOptions(db),
		db
			.select({ username: user.username, name: user.name })
			.from(user)
			.where(eq(user.approved, true))
			.orderBy(user.name)
	]);
	return { ...options, authors };
}

export async function getSeries(db: Database, id: number) {
	return (
		(await db
			.select({ id: series.id, title: series.title, description: series.description })
			.from(series)
			.where(eq(series.id, id))
			.get()) ?? null
	);
}

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

export async function getCategory(db: Database, id: number) {
	return (
		(await db
			.select({ id: categories.id, name: categories.name, description: categories.description })
			.from(categories)
			.where(eq(categories.id, id))
			.get()) ?? null
	);
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
