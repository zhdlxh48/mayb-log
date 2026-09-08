import type { SearchDocument, SearchKind } from './search.ts';

export const SUMMARY_LIMIT = 10;
export const PAGE_SIZE = 20;
export const PAGE_BLOCK_SIZE = 10;

export type SearchFilter = Exclude<SearchKind, 'about'> | 'all';

export const SEARCH_FILTERS = [
  { kind: 'all', label: 'All' },
  { kind: 'post', label: 'Posts' },
  { kind: 'series', label: 'Series' },
  { kind: 'category', label: 'Categories' },
  { kind: 'tag', label: 'Tags' },
  { kind: 'author', label: 'Authors' },
  { kind: 'archive', label: 'Archive' },
] as const satisfies ReadonlyArray<{ kind: SearchFilter; label: string }>;

export const RESULT_KINDS: Exclude<SearchKind, 'about'>[] = [
  'post',
  'series',
  'category',
  'tag',
  'author',
  'archive',
];

export function isSearchFilter(value: string | null): value is Exclude<SearchFilter, 'all'> {
  return SEARCH_FILTERS.slice(1).some((filter) => filter.kind === value);
}

export function groupSearchResults(documents: SearchDocument[]) {
  return Object.fromEntries(
    ['about', ...RESULT_KINDS].map((kind) => [
      kind,
      documents.filter((document) => document.kind === kind),
    ]),
  ) as Record<SearchKind, SearchDocument[]>;
}

export function getSearchCounts(documents: SearchDocument[]) {
  const groups = groupSearchResults(documents);
  return Object.fromEntries(
    SEARCH_FILTERS.map((filter) => [
      filter.kind,
      filter.kind === 'all' ? documents.length : groups[filter.kind].length,
    ]),
  ) as Record<SearchFilter, number>;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  pages: number[];
  firstPage: number | null;
  previousGroupPage: number | null;
  nextGroupPage: number | null;
  lastPage: number | null;
}

export function getPagination(totalItems: number, requestedPage: number): Pagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(Math.max(Math.trunc(requestedPage) || 1, 1), totalPages);
  const blockStart = Math.floor((currentPage - 1) / PAGE_BLOCK_SIZE) * PAGE_BLOCK_SIZE + 1;
  const blockEnd = Math.min(blockStart + PAGE_BLOCK_SIZE - 1, totalPages);

  return {
    currentPage,
    totalPages,
    pages: Array.from({ length: blockEnd - blockStart + 1 }, (_, index) => blockStart + index),
    firstPage: currentPage > 1 ? 1 : null,
    previousGroupPage: blockStart > 1 ? blockStart - 1 : null,
    nextGroupPage: blockEnd < totalPages ? blockEnd + 1 : null,
    lastPage: currentPage < totalPages ? totalPages : null,
  };
}

export function getPageItems(documents: SearchDocument[], requestedPage: number) {
  const pagination = getPagination(documents.length, requestedPage);
  const start = (pagination.currentPage - 1) * PAGE_SIZE;
  return {
    items: documents.slice(start, start + PAGE_SIZE),
    pagination,
  };
}
