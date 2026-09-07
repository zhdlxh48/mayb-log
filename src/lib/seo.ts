import type { CollectionEntry } from 'astro:content';
import type { Post } from './taxonomy.ts';
import { absolute } from './urls.ts';

export function blogPosting(post: Post, authors: CollectionEntry<'authors'>[], image?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.data.title,
    description: post.data.seo.description ?? post.data.description,
    url: absolute(`posts/${post.id}`),
    mainEntityOfPage: absolute(`posts/${post.id}`),
    datePublished: post.data.publishedAt.toISOString(),
    dateModified: (post.data.updatedAt ?? post.data.publishedAt).toISOString(),
    inLanguage: post.data.lang,
    author: authors.map((author) => ({
      '@type': 'Person',
      name: author.data.name,
      url: author.data.homepage ?? absolute(`authors/${author.id}`),
      sameAs: author.data.sameAs,
    })),
    ...(image ? { image: [image] } : {}),
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
export function xmlText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
