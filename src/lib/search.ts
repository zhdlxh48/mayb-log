import { Index } from 'flexsearch';

export interface SearchDocument {
  id: number;
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
