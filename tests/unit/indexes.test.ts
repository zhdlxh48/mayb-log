import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, getTaxonomy, newestFirst, type Post } from '../../src/lib/taxonomy.ts';
import { getArchive } from '../../src/lib/archive.ts';

function post(id: string, publishedAt: string, tags: string[] = []): Post {
  return {
    id,
    collection: 'posts',
    filePath: `posts/${id}/index.md`,
    data: {
      title: id,
      description: id,
      authors: [{ collection: 'authors', id: 'owner' }],
      publishedAt: new Date(publishedAt),
      tags,
      categories: [],
      draft: false,
      lang: 'ko',
      seo: { noindex: false },
    },
  };
}

test('Unicode slugs, normalization and invalid empty names', () => {
  assert.equal(slugify(' Web Development '), 'web-development');
  assert.equal(slugify('개인 개발'), '개인-개발');
  assert.equal(slugify('ＡＳＴＲＯ'), 'astro');
  assert.throws(() => slugify('!!!'), /URL/);
});
test('taxonomy counts each post once and rejects ambiguous URLs', () => {
  const a = post('a', '2026-01-01', ['Astro', 'Astro']);
  assert.equal(getTaxonomy([a], 'tags')[0]!.count, 1);
  assert.throws(() => getTaxonomy([a, post('b', '2026-02-01', ['astro'])], 'tags'), /충돌/);
  assert.throws(() => getTaxonomy([post('c', '2026-01-01', ['C++', 'C#'])], 'tags'), /충돌/);
});
test('stable post ordering and Seoul archive grouping', () => {
  const posts = [
    post('b', '2025-12-31T15:00:00Z'),
    post('a', '2025-12-31T15:00:00Z'),
    post('c', '2025-12-31T14:59:59Z'),
  ].sort(newestFirst);
  assert.deepEqual(
    posts.map((p) => p.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    getArchive(posts).map((year) => [year.year, year.count]),
    [
      ['2026', 2],
      ['2025', 1],
    ],
  );
  assert.deepEqual(getArchive([]), []);
});
