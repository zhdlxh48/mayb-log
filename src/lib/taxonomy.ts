import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export const collator = new Intl.Collator('ko');

export function slugify(name: string): string {
  const slug = name
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new Error(`분류 이름에서 URL을 만들 수 없습니다: "${name}"`);
  return slug;
}

export function newestFirst(a: Post, b: Post): number {
  return b.data.publishedAt.getTime() - a.data.publishedAt.getTime() || a.id.localeCompare(b.id);
}

export function getTaxonomy(posts: Post[], field: 'tags' | 'categories') {
  const groups = new Map<string, { name: string; slug: string; posts: Post[] }>();
  for (const post of posts) {
    for (const name of new Set(post.data[field])) {
      const slug = slugify(name);
      const existing = groups.get(slug);
      if (existing && existing.name !== name) {
        throw new Error(
          `${post.filePath}: ${field} URL 충돌: "${existing.name}" / "${name}" → ${slug}`,
        );
      }
      if (existing) existing.posts.push(post);
      else groups.set(slug, { name, slug, posts: [post] });
    }
  }
  return [...groups.values()]
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((group) => ({
      ...group,
      count: group.posts.length,
      posts: group.posts.sort(newestFirst),
    }));
}
