import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { site } from '../src/config/site.ts';

const base = `${site.origin}${site.base}/`;
const revision = await (await fetch(new URL(`revision.json?check=${Date.now()}`, base))).json();
if (process.env.EXPECTED_COMMIT) assert.equal(revision.commit, process.env.EXPECTED_COMMIT);
const checks = [];
const files = await readdir('dist', { recursive: true });
for (const file of files.filter(file => file.endsWith('.html'))) {
  const path = file.replaceAll('\\', '/').replace(/index\.html$/, '');
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  const actual = parseHTML(await response.text()).document;
  const expected = parseHTML(await readFile(`dist/${file}`, 'utf8')).document;
  assert.equal(actual.querySelector('title').textContent, expected.querySelector('title').textContent, path);
  assert.equal(actual.querySelector('link[rel="canonical"]').getAttribute('href'), expected.querySelector('link[rel="canonical"]').getAttribute('href'), path);
  checks.push({ path: path || '/', status: response.status });
}
for (const path of ['rss.xml', 'sitemap-index.xml', 'sitemap-0.xml', 'pagefind/pagefind.js']) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  checks.push({ path, status: response.status });
}
const missing = await fetch(new URL('does-not-exist-verification/', base));
assert.equal(missing.status, 404);
assert.ok((await missing.text()).includes('페이지를 찾을 수 없습니다'));
checks.push({ path: 'does-not-exist-verification/', status: 404 });
const report = { checkedAt: new Date().toISOString(), base, commit: revision.commit, checks };
await mkdir('docs/verification', { recursive: true });
await writeFile('docs/verification/deployment.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Verified deployed commit ${revision.commit}, ${checks.length} public paths including Unicode, search assets, RSS, Sitemap and custom 404.`);
