import { relations } from 'drizzle-orm';
import {
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
	description: text('description').notNull().default(''),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
});

export const posts = sqliteTable(
	'posts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id),
		title: text('title').notNull(),
		subtitle: text('subtitle'),
		description: text('description').notNull(),
		bodyMarkdown: text('body_markdown').notNull(),
		seriesId: integer('series_id').references(() => series.id, { onDelete: 'set null' }),
		seriesPosition: integer('series_position'),
		draft: integer('draft', { mode: 'boolean' }).notNull().default(true),
		noindex: integer('noindex', { mode: 'boolean' }).notNull().default(false),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		index('posts_public_idx').on(table.draft, table.publishedAt),
		index('posts_author_idx').on(table.authorId),
		index('posts_series_idx').on(table.seriesId),
		uniqueIndex('posts_series_position_idx').on(table.seriesId, table.seriesPosition)
	]
);

export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	description: text('description').notNull().default(''),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
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
	(table) => [primaryKey({ columns: [table.postId, table.categoryId] })]
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
	(table) => [primaryKey({ columns: [table.postId, table.tagId] })]
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
