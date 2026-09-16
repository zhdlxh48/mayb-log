import { relations, sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const series = pgTable('series', {
	id: bigint('id', { mode: 'number' })
		.primaryKey()
		.generatedAlwaysAsIdentity({ maxValue: Number.MAX_SAFE_INTEGER }),
	title: text('title').notNull().unique(),
	description: text('description').notNull().default('')
});

export const posts = pgTable(
	'posts',
	{
		id: bigint('id', { mode: 'number' })
			.primaryKey()
			.generatedAlwaysAsIdentity({ maxValue: Number.MAX_SAFE_INTEGER }),
		assetId: uuid('asset_id').notNull().unique(),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id),
		title: text('title').notNull(),
		subtitle: text('subtitle'),
		description: text('description').notNull(),
		bodyMarkdown: text('body_markdown').notNull(),
		seriesId: bigint('series_id', { mode: 'number' }).references(() => series.id, {
			onDelete: 'set null'
		}),
		seriesPosition: bigint('series_position', { mode: 'number' }),
		noindex: boolean('noindex').notNull().default(false),
		publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [
		index('posts_published_idx')
			.on(table.publishedAt, table.id)
			.where(sql`${table.publishedAt} IS NOT NULL`),
		index('posts_author_idx').on(table.authorId),
		uniqueIndex('posts_series_position_idx').on(table.seriesId, table.seriesPosition),
		index('posts_search_trgm_idx').using(
			'gin',
			sql`(${table.title} || ' ' || coalesce(${table.subtitle}, '') || ' ' || ${table.description} || ' ' || ${table.bodyMarkdown}) gin_trgm_ops`
		),
		check(
			'posts_series_position_check',
			sql`(${table.seriesId} IS NULL AND ${table.seriesPosition} IS NULL) OR (${table.seriesId} IS NOT NULL AND ${table.seriesPosition} IS NOT NULL AND ${table.seriesPosition} > 0 AND ${table.seriesPosition} <= ${sql.raw(String(Number.MAX_SAFE_INTEGER))})`
		)
	]
);

export const categories = pgTable('categories', {
	id: bigint('id', { mode: 'number' })
		.primaryKey()
		.generatedAlwaysAsIdentity({ maxValue: Number.MAX_SAFE_INTEGER }),
	name: text('name').notNull().unique(),
	description: text('description').notNull().default('')
});

export const postCategories = pgTable(
	'post_categories',
	{
		postId: bigint('post_id', { mode: 'number' })
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		categoryId: bigint('category_id', { mode: 'number' })
			.notNull()
			.references(() => categories.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.categoryId] }),
		index('post_categories_category_idx').on(table.categoryId, table.postId)
	]
);

export const postTags = pgTable(
	'post_tags',
	{
		postId: bigint('post_id', { mode: 'number' })
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		tag: text('tag').notNull()
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.tag] }),
		index('post_tags_tag_idx').on(table.tag, table.postId)
	]
);

export const postRelations = relations(posts, ({ one, many }) => ({
	author: one(user, { fields: [posts.authorId], references: [user.id] }),
	series: one(series, { fields: [posts.seriesId], references: [series.id] }),
	categories: many(postCategories),
	tags: many(postTags)
}));

export const seriesRelations = relations(series, ({ many }) => ({ posts: many(posts) }));
export const categoryRelations = relations(categories, ({ many }) => ({
	posts: many(postCategories)
}));
export const postCategoryRelations = relations(postCategories, ({ one }) => ({
	post: one(posts, { fields: [postCategories.postId], references: [posts.id] }),
	category: one(categories, { fields: [postCategories.categoryId], references: [categories.id] })
}));
export const postTagRelations = relations(postTags, ({ one }) => ({
	post: one(posts, { fields: [postTags.postId], references: [posts.id] })
}));
