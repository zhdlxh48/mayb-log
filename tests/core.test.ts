import { test } from 'node:test';
import assert from 'node:assert/strict';
import { url, absolute } from '../src/lib/urls.ts';
import { dateParts } from '../src/lib/dates.ts';

test('project URLs preserve base, Unicode and file extensions', () => {
  assert.equal(url(), '/mayb-log/');
  assert.equal(url('/posts/example/'), '/mayb-log/posts/example/');
  assert.equal(url('rss.xml'), '/mayb-log/rss.xml');
  assert.equal(decodeURI(url('tags/개인-개발')), '/mayb-log/tags/개인-개발/');
  assert.equal(absolute('posts/example'), 'https://zhdlxh48.github.io/mayb-log/posts/example/');
});

test('archive boundaries use Seoul rather than UTC', () => {
  assert.deepEqual(dateParts(new Date('2025-12-31T15:00:00Z')), { year: '2026', month: '01', day: '01' });
  assert.deepEqual(dateParts(new Date('2026-08-31T14:59:59Z')), { year: '2026', month: '08', day: '31' });
});
