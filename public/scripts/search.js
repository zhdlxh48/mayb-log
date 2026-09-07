// Pagefind is generated after the Astro build; load it directly as a browser module.
const form = document.querySelector('.search-form');
const input = document.querySelector('#search-input');
const searchStatus = document.querySelector('#search-status');
const list = document.querySelector('#search-results');
let engine;
let request = 0;
let timer;

async function search() {
  const current = ++request;
  const query = input.value.trim();
  list.replaceChildren();
  if (!query) { searchStatus.textContent = '검색어를 입력하면 결과가 표시됩니다.'; return; }
  searchStatus.textContent = '검색 중…';
  try {
    engine ??= import(form.dataset.searchModule).then(async (pagefind) => {
      await pagefind.options({ baseUrl: form.dataset.base });
      return pagefind;
    });
    const results = await (await engine).search(query);
    const entries = await Promise.all(results.results.map(result => result.data()));
    if (current !== request) return;
    searchStatus.textContent = entries.length ? `${entries.length}개의 검색 결과` : '검색 결과가 없습니다.';
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const item = document.createElement('li');
      const heading = document.createElement('h2');
      const link = document.createElement('a');
      link.href = entry.url;
      link.textContent = entry.meta.title ?? entry.url;
      heading.append(link);
      const excerpt = document.createElement('p');
      const template = document.createElement('template');
      template.innerHTML = entry.excerpt;
      excerpt.textContent = template.content.textContent;
      item.append(heading, excerpt);
      fragment.append(item);
    }
    list.replaceChildren(fragment);
  } catch {
    if (current !== request) return;
    engine = undefined;
    searchStatus.textContent = '검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
}
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 180); });
form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); search(); });

