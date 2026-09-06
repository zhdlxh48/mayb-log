import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const text = z.string().trim().min(1);

const posts = defineCollection({
  loader: glob({
    pattern: '*/index.md', base: './src/content/posts',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: ({ image }) => z.object({
    title: text,
    subtitle: text.optional(),
    description: text,
    tags: z.array(text).default([]),
    categories: z.array(text).default([]),
    series: reference('series').optional(),
    seriesOrder: z.number().int().positive().optional(),
    thumbnail: image().optional(),
    thumbnailAlt: text.optional(),
    authors: z.array(reference('authors')).min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    lang: text.default('ko'),
    draft: z.boolean().default(false),
    seo: z.object({
      title: text.optional(), description: text.optional(), noindex: z.boolean().default(false),
    }).default({ noindex: false }),
  }).superRefine((post, ctx) => {
    const error = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (post.thumbnail && !post.thumbnailAlt) error('thumbnailAlt', 'thumbnail이 있으면 thumbnailAlt가 필요합니다.');
    if (Boolean(post.series) !== (post.seriesOrder !== undefined)) error('seriesOrder', 'series와 seriesOrder를 함께 입력하세요.');
    if (post.updatedAt && post.updatedAt < post.publishedAt) error('updatedAt', 'updatedAt은 publishedAt보다 이전일 수 없습니다.');
    if (new Set(post.authors.map(author => author.id)).size !== post.authors.length) error('authors', '작성자 참조가 중복되었습니다.');
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: './src/content/authors' }),
  schema: ({ image }) => z.object({
    name: text, bio: text.optional(), avatar: image().optional(),
    homepage: z.url({ protocol: /^https?$/ }).optional(), sameAs: z.array(z.url({ protocol: /^https?$/ })).default([]),
  }),
});

const series = defineCollection({
  loader: glob({ pattern: '*.yml', base: './src/content/series' }),
  schema: z.object({ title: text, description: text.optional(), order: z.number().default(0) }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({ title: text, description: text, updatedAt: z.coerce.date().optional() }),
});

export const collections = { posts, authors, series, pages };
