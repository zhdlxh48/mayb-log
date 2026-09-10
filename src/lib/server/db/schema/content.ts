import { relations, sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import { user } from './auth';

export const series = sqliteTable('series', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull().unique(),
	description: text('description').notNull().default('')
});

export const posts = sqliteTable(
	'posts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		assetId: text('asset_id').notNull().unique(),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id),
		title: text('title').notNull(),
		subtitle: text('subtitle'),
		description: text('description').notNull(),
		bodyMarkdown: text('body_markdown').notNull(),
		seriesId: integer('series_id').references(() => series.id, { onDelete: 'set null' }),
		seriesPosition: integer('series_position'),
		noindex: integer('noindex', { mode: 'boolean' }).notNull().default(false),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		index('posts_published_idx')
			.on(table.publishedAt, table.id)
			.where(sql`${table.publishedAt} IS NOT NULL`),
		index('posts_author_idx').on(table.authorId),
		uniqueIndex('posts_series_position_idx').on(table.seriesId, table.seriesPosition),
		check(
			'posts_series_position_check',
			sql`(${table.seriesId} IS NULL AND ${table.seriesPosition} IS NULL) OR (${table.seriesId} IS NOT NULL AND ${table.seriesPosition} IS NOT NULL)`
		)
	]
);

export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	description: text('description').notNull().default('')
});

export const tags = sqliteTable('tags', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

export const postCategories = sqliteTable(
	'post_categories',
	{
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		categoryId: integer('category_id')
			.notNull()
			.references(() => categories.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.categoryId] }),
		index('post_categories_category_idx').on(table.categoryId, table.postId)
	]
);

export const postTags = sqliteTable(
	'post_tags',
	{
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.tagId] }),
		index('post_tags_tag_idx').on(table.tagId, table.postId)
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

export const tagRelations = relations(tags, ({ many }) => ({ posts: many(postTags) }));

export const postCategoryRelations = relations(postCategories, ({ one }) => ({
	post: one(posts, { fields: [postCategories.postId], references: [posts.id] }),
	category: one(categories, { fields: [postCategories.categoryId], references: [categories.id] })
}));

export const postTagRelations = relations(postTags, ({ one }) => ({
	post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
	tag: one(tags, { fields: [postTags.tagId], references: [tags.id] })
}));
