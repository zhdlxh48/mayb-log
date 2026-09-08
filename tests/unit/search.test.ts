import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import {
  createSearchIndex,
  normalizeSearchText,
  searchDocuments,
  type SearchDocument,
} from '../../src/lib/search.ts';
import {
  buildSearchText,
  buildSearchDocumentText,
  extractVisibleText,
  type SearchTextFields,
} from '../../src/lib/search-text.ts';

const fields: SearchTextFields[] = [
  { title: 'Markdown 안내' },
  { title: '설명 검색', description: '미래의 나에게 보내는 친절한 메모' },
  { title: '작성자 검색', authors: ['Ada Searcher'] },
  { title: '시리즈 검색', series: 'Astro Journey' },
  { title: '본문 검색', body: '렌더링된 본문에만 있는 고유표현' },
];
const documents: SearchDocument[] = fields.map((entry, id) => ({
  id,
  kind: 'post',
  url: `/posts/${id}/`,
  title: entry.title,
  description: entry.description ?? '',
  text: buildSearchText(entry),
}));

test('full tokenizer finds exact English suffixes and Korean infixes', () => {
  const index = createSearchIndex(documents);
  assert.deepEqual(index.search(normalizeSearchText('down')), [0]);
  assert.deepEqual(index.search(normalizeSearchText('ark')), [0]);
  assert.deepEqual(index.search(normalizeSearchText('절한')), [1]);
});

test('each result kind indexes only its intended fields', () => {
  const childPostTitle = '하위게시물전용문구';
  const cases = [
    ['about', { title: 'About', description: '소개 설명', body: '소개 본문' }, '소개 본문'],
    ['post', { title: '글', body: childPostTitle }, childPostTitle],
    [
      'series',
      { title: '시리즈', description: '시리즈 설명', body: childPostTitle },
      '시리즈 설명',
    ],
    ['category', { title: '개발 분류', name: '개발', body: childPostTitle }, '개발'],
    ['tag', { title: 'Astro 태그', name: 'Astro', body: childPostTitle }, 'Astro'],
    [
      'author',
      { title: '작성자', description: '작성자 소개', body: childPostTitle },
      '작성자 소개',
    ],
    ['archive', { title: '2026년 09월 Archive', body: childPostTitle }, '2026년 09월 Archive'],
  ] as const;

  for (const [kind, entry, expected] of cases) {
    const text = buildSearchDocumentText(kind, entry);
    assert.match(text, new RegExp(expected));
    if (kind !== 'post' && kind !== 'about') assert.doesNotMatch(text, /하위게시물전용문구/);
    if (kind === 'category') assert.equal(text, '개발');
    if (kind === 'tag') assert.equal(text, 'Astro');
  }
});

test('search returns every matching document beyond the old 50-result limit', () => {
  const many = Array.from({ length: 65 }, (_, id): SearchDocument => ({
    id,
    kind: 'post',
    url: `/posts/${id}/`,
    title: `Result ${id}`,
    description: '',
    text: `sharedterm result ${id}`,
  }));
  assert.equal(searchDocuments(createSearchIndex(many), many, 'sharedterm').length, 65);
});

test('search text includes description, author, series and rendered body fields', () => {
  const index = createSearchIndex(documents);
  assert.deepEqual(index.search(normalizeSearchText('친절한')), [1]);
  assert.deepEqual(index.search(normalizeSearchText('searcher')), [2]);
  assert.deepEqual(index.search(normalizeSearchText('journey')), [3]);
  assert.deepEqual(index.search(normalizeSearchText('고유표현')), [4]);
});

test('visible text keeps useful content and removes non-visible implementation nodes', () => {
  const { document } = parseHTML(`
    <div>
      본문 <a href="/target">링크 미리보기</a>
      <img src="image.jpg" alt="설명 이미지">
      <script>script-secret</script><style>.style-secret {}</style>
      <template>template-secret</template><noscript>noscript-secret</noscript>
      <span hidden>hidden-secret</span><span aria-hidden="true">aria-secret</span>
      <span data-search-ignore>internal-secret</span>
    </div>
  `);
  const text = extractVisibleText(document.querySelector('div'));
  assert.match(text, /본문 링크 미리보기/);
  assert.match(text, /설명 이미지/);
  assert.doesNotMatch(text, /secret/);
});
