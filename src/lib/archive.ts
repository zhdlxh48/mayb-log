import type { Post } from './taxonomy.ts';
import { dateParts } from './dates.ts';

export function getArchive(posts: Post[]) {
  const years = new Map<string, Map<string, Post[]>>();
  for (const post of posts) {
    const { year, month } = dateParts(post.data.publishedAt);
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year)!;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(post);
  }
  return [...years]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => {
      const entries = [...months]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, posts]) => ({ month, posts, count: posts.length }));
      return {
        year,
        months: entries,
        posts: entries.flatMap((entry) => entry.posts),
        count: entries.reduce((sum, entry) => sum + entry.count, 0),
      };
    });
}
