/// <reference lib="webworker" />

import { createSearchIndex, normalizeSearchText, type SearchDocument } from '../lib/search';

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
    const ids = index.search(normalizeSearchText(message.query), { limit: 50 });
    self.postMessage({
      type: 'results',
      requestId: message.requestId,
      documents: ids.map((id) => documents[Number(id)]).filter(Boolean),
    });
  }
});
