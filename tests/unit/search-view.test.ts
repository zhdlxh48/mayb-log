import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SearchDocument, SearchKind } from '../../src/lib/search.ts';
import {
  getPageItems,
  getPagination,
  getSearchCounts,
  groupSearchResults,
  PAGE_SIZE,
  SUMMARY_LIMIT,
} from '../../src/lib/search-view.ts';

function documents(kind: SearchKind, count: number, start = 0): SearchDocument[] {
  return Array.from({ length: count }, (_, offset) => ({
    id: start + offset,
    kind,
    url: `/${kind}/${offset}/`,
    title: `${kind} ${offset}`,
    description: '',
    text: `result ${offset}`,
  }));
}

test('grouping and counts preserve relevance order and include About only in All', () => {
  const entries = [
    ...documents('about', 1),
    ...documents('post', 12, 10),
    ...documents('tag', 3, 30),
  ];
  const groups = groupSearchResults(entries);
  assert.equal(getSearchCounts(entries).all, 16);
  assert.equal(getSearchCounts(entries).post, 12);
  assert.equal(getSearchCounts(entries).tag, 3);
  assert.deepEqual(
    groups.post.map((entry) => entry.id),
    entries.filter((entry) => entry.kind === 'post').map((entry) => entry.id),
  );
  assert.deepEqual(
    groups.post.slice(0, SUMMARY_LIMIT).map((entry) => entry.id),
    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  );
});

test('filtered results use 20 items per page and clamp invalid pages', () => {
  const entries = documents('post', 45);
  assert.equal(PAGE_SIZE, 20);
  assert.deepEqual(
    getPageItems(entries, 2).items.map((entry) => entry.id),
    Array.from({ length: 20 }, (_, index) => index + 20),
  );
  assert.equal(getPageItems(entries, 99).pagination.currentPage, 3);
  assert.equal(getPageItems(entries, -4).pagination.currentPage, 1);
});

test('pagination uses fixed ten-page blocks and group controls', () => {
  const totalItems = 47 * PAGE_SIZE;
  assert.deepEqual(getPagination(totalItems, 5), {
    currentPage: 5,
    totalPages: 47,
    pages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    firstPage: 1,
    previousGroupPage: null,
    nextGroupPage: 11,
    lastPage: 47,
  });
  assert.deepEqual(getPagination(totalItems, 13), {
    currentPage: 13,
    totalPages: 47,
    pages: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    firstPage: 1,
    previousGroupPage: 10,
    nextGroupPage: 21,
    lastPage: 47,
  });
  assert.deepEqual(getPagination(totalItems, 27).pages, [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  assert.equal(getPagination(totalItems, 27).previousGroupPage, 20);
  assert.equal(getPagination(totalItems, 27).nextGroupPage, 31);
  assert.deepEqual(getPagination(totalItems, 47), {
    currentPage: 47,
    totalPages: 47,
    pages: [41, 42, 43, 44, 45, 46, 47],
    firstPage: 1,
    previousGroupPage: 40,
    nextGroupPage: null,
    lastPage: null,
  });
});
