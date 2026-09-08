import { Index } from 'flexsearch';

export const SEARCH_KINDS = [
  'about',
  'post',
  'series',
  'category',
  'tag',
  'author',
  'archive',
] as const;

export type SearchKind = (typeof SEARCH_KINDS)[number];

export function isSearchKind(value: string | undefined): value is SearchKind {
  return SEARCH_KINDS.some((kind) => kind === value);
}

export interface SearchDocument {
  id: number;
  kind: SearchKind;
  url: string;
  title: string;
  description: string;
  text: string;
}

export function normalizeSearchText(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase();
}

export function createSearchIndex(documents: SearchDocument[]) {
  const index = new Index({ tokenize: 'full', cache: 100 });
  for (const document of documents) {
    index.add(document.id, normalizeSearchText(document.text));
  }
  return index;
}

export function searchDocuments(
  index: ReturnType<typeof createSearchIndex>,
  documents: SearchDocument[],
  query: string,
) {
  const ids = index.search(normalizeSearchText(query), { limit: documents.length });
  return ids.map((id) => documents[Number(id)]).filter((document) => document !== undefined);
}
