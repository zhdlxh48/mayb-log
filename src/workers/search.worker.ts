/// <reference lib="webworker" />

import { createSearchIndex, searchDocuments, type SearchDocument } from '../lib/search';

let documents: SearchDocument[] = [];
let index: ReturnType<typeof createSearchIndex>;

self.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;

  if (message.type === 'initialize') {
    documents = message.documents;
    index = createSearchIndex(documents);
    self.postMessage({ type: 'ready' });
    return;
  }

  if (message.type === 'search' && index) {
    self.postMessage({
      type: 'results',
      requestId: message.requestId,
      documents: searchDocuments(index, documents, message.query),
    });
  }
});
