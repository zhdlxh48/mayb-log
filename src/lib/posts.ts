import { getCollection } from 'astro:content';
import { collator, getTaxonomy, newestFirst } from './taxonomy.ts';
import { getArchive } from './archive.ts';

async function loadContent() {
  const [allPosts, authors, allSeries] = await Promise.all([
    getCollection('posts'), getCollection('authors'), getCollection('series'),
  ]);
  const orders = new Set<string>();
  // Validate references explicitly: a reference schema alone does not resolve entries.
  for (const post of allPosts) {
    for (const author of post.data.authors) {
      if (!authors.some(entry => entry.id === author.id)) throw new Error(`${post.filePath}: 없는 author: ${author.id}`);
    }
    if (post.data.series) {
      if (!allSeries.some(entry => entry.id === post.data.series!.id)) throw new Error(`${post.filePath}: 없는 series: ${post.data.series.id}`);
      const key = `${post.data.series.id}:${post.data.seriesOrder}`;
      if (orders.has(key)) throw new Error(`${post.filePath}: 중복 seriesOrder: ${key}`);
      orders.add(key);
    }
  }
  // Validate drafts too, while keeping them out of every public index.
  getTaxonomy(allPosts, 'tags');
  getTaxonomy(allPosts, 'categories');
  const posts = allPosts.filter(post => !post.data.draft).sort(newestFirst);
  const series = allSeries.map(entry => {
    const entries = posts.filter(post => post.data.series?.id === entry.id)
      .sort((a, b) => a.data.seriesOrder! - b.data.seriesOrder!);
    return { ...entry, posts: entries, count: entries.length };
  }).filter(entry => entry.count > 0)
    .sort((a, b) => a.data.order - b.data.order || collator.compare(a.data.title, b.data.title));
  return {
    posts, authors, series, totalPosts: posts.length,
    tags: getTaxonomy(posts, 'tags'), categories: getTaxonomy(posts, 'categories'), archive: getArchive(posts),
  };
}

let content: ReturnType<typeof loadContent> | undefined;
export function getContent() {
  // Recompute during development so editing Markdown updates navigation counts.
  if (import.meta.env.DEV) return loadContent();
  return content ??= loadContent();
}

export async function getPublishedPosts() { return (await getContent()).posts; }
