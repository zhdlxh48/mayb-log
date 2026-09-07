import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSearchIndex,
  normalizeSearchText,
  type SearchDocument,
} from '../../src/lib/search.ts';

const documents: SearchDocument[] = [
  {
    id: 0,
    url: '/posts/markdown/',
    title: 'Markdown 안내',
    description: '미래의 나에게 보내는 친절한 메모',
    text: 'Markdown 안내 미래의 나에게 보내는 친절한 메모',
  },
];

test('full tokenizer finds English and Korean substrings', () => {
  const index = createSearchIndex(documents);
  assert.deepEqual(index.search(normalizeSearchText('ark')), [0]);
  assert.deepEqual(index.search(normalizeSearchText('절한')), [0]);
});
