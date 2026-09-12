import { and, count, eq, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { categories, postCategories, posts, series } from '$lib/server/db/schema/content';
import { publicPostCondition } from '$lib/server/db/queries/posts/read';

export async function getSeriesList(db: Database, now = new Date()) {
	return db
		.select({
			id: series.id,
			title: series.title,
			description: series.description,
			count: count(posts.id)
		})
		.from(series)
		.leftJoin(posts, and(eq(posts.seriesId, series.id), publicPostCondition(now)))
		.groupBy(series.id)
		.orderBy(series.title);
}

export async function getCategoryList(db: Database, now = new Date()) {
	return db
		.select({
			id: categories.id,
			name: categories.name,
			description: categories.description,
			count: sql<number>`count(${posts.id})`
		})
		.from(categories)
		.leftJoin(postCategories, eq(postCategories.categoryId, categories.id))
		.leftJoin(posts, and(eq(posts.id, postCategories.postId), publicPostCondition(now)))
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

export async function getCategory(db: Database, id: number) {
	return (
		(await db
			.select({ id: categories.id, name: categories.name, description: categories.description })
			.from(categories)
			.where(eq(categories.id, id))
			.get()) ?? null
	);
}
