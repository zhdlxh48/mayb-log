import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile, rm, symlink, access } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseHTML } from 'linkedom';
import sharp from 'sharp';
import { seedTestContent } from './seed-test-content.mjs';
sharp.cache(false);

// Every mutation stays in this disposable copy. Real content is never edited.
const workspace = resolve('.');
const fixture = resolve('.fixtures/content-build');
assert.ok(fixture.startsWith(workspace + sep));
async function remove(path) {
  const target = resolve(fixture, path);
  assert.ok(target.startsWith(fixture + sep));
  await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
await mkdir(fixture, { recursive: true });
await remove('src');
for (const path of ['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json']) await cp(path, resolve(fixture, path), { recursive: true, force: true });
// node_modules is shared, but Astro's content cache must belong to this fixture.
const configPath = resolve(fixture, 'astro.config.mjs');
await writeFile(configPath, (await readFile(configPath, 'utf8')).replace('export default defineConfig({', "export default defineConfig({ cacheDir: './.astro/cache/',"));
await remove('src/content');
await seedTestContent(fixture);
try { await access(resolve(fixture, 'node_modules')); } catch { await symlink(resolve('node_modules'), resolve(fixture, 'node_modules'), 'junction'); }
await mkdir(resolve(fixture, 'logs'), { recursive: true });
const valid = '---\ntitle: Validation\ndescription: 검증용 콘텐츠\nauthors: [owner]\npublishedAt: 2030-01-01T00:00:00+09:00\n---\n\n검증 본문입니다.\n';
async function writePost(markdown, id = 'validation') {
  await mkdir(resolve(fixture, `src/content/posts/${id}`), { recursive: true });
  await writeFile(resolve(fixture, `src/content/posts/${id}/index.md`), markdown);
}
function run(script, args) {
  const result = spawnSync(process.execPath, [resolve(workspace, script), ...args], { cwd: fixture, encoding: 'utf8', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}
async function build(name, expectedError) {
  await remove('.astro');
  await remove('dist');
  const result = run('node_modules/astro/bin/astro.mjs', ['build']);
  await writeFile(resolve(fixture, `logs/${name}.txt`), result.output);
  if (expectedError) {
    assert.notEqual(result.status, 0, `${name}: should fail`);
    assert.match(result.output, expectedError, `${name}: wrong error (see .fixtures/content-build/logs)`);
  } else assert.equal(result.status, 0, `${name}: ${result.output.slice(-2000)}`);
  console.log(`PASS ${name}`);
}

const failures = [
  ['empty-title', valid.replace('title: Validation', 'title: ""'), /title/],
  ['missing-description', valid.replace('description: 검증용 콘텐츠\n', ''), /description/],
  ['missing-author', valid.replace('[owner]', '[nobody]'), /없는 author/],
  ['empty-authors', valid.replace('[owner]', '[]'), /authors/],
  ['invalid-date', valid.replace('2030-01-01T00:00:00+09:00', 'invalid'), /publishedAt/],
  ['reversed-date', valid.replace('authors:', 'updatedAt: 2020-01-01\nauthors:'), /updatedAt/],
  ['missing-series', valid.replace('authors:', 'series: missing\nseriesOrder: 1\nauthors:'), /없는 series/],
  ['missing-order', valid.replace('authors:', 'series: blog-notes\nauthors:'), /seriesOrder/],
  ['duplicate-order', valid.replace('authors:', 'series: blog-notes\nseriesOrder: 1\nauthors:'), /중복 seriesOrder/],
  ['taxonomy-collision', valid.replace('authors:', 'tags: [astro]\nauthors:'), /충돌/],
  ['missing-image', valid.replace('authors:', 'thumbnail: ./missing.jpg\nthumbnailAlt: 설명\nauthors:'), /missing.jpg/],
  ['missing-thumbnail-alt', valid.replace('authors:', 'thumbnail: ../first-note/images/tiny.jpg\nauthors:'), /thumbnailAlt/],
  ['missing-body-alt', valid + '\n![](../first-note/images/tiny.jpg)', /alt 설명/],
  ['unknown-directive', valid + '\n::yotube{}', /Unknown directive/],
  ['missing-directive-attribute', valid + '\n::youtube{id="aqz-KE-bpKQ"}', /필수 속성 title/],
  ['unknown-directive-attribute', valid + '\n::metric{label="x" value="1" stats="good"}', /알 수 없는 속성 stats/],
];
for (const [name, markdown, error] of failures.filter(([name]) => !process.env.CONTENT_CASE || name === process.env.CONTENT_CASE)) {
  await writePost(markdown);
  await build(name, error);
}

await writePost(valid + '\n[내부 링크](/tags/기록/)');
await writePost(valid.replace('title: Validation', 'title: Draftsentinel').replace('authors:', 'draft: true\ntags: [Draftsentinel]\nauthors:'), 'draft-test');
await writePost(valid.replace('authors:', 'thumbnail: ../first-note/images/diagram.svg\nthumbnailAlt: SVG\nauthors:'), 'svg-test');
await writePost(valid.replace('authors:', 'thumbnail: ../first-note/images/tiny.jpg\nthumbnailAlt: 작은 이미지\nauthors:'), 'tiny-test');
await build('public-future-draft-svg-small');
const html = async path => parseHTML(await readFile(resolve(fixture, `dist/${path}`), 'utf8')).document;
await assert.rejects(access(resolve(fixture, 'dist/posts/draft-test/index.html')));
await access(resolve(fixture, 'dist/posts/validation/index.html'));
assert.equal((await html('posts/svg-test/index.html')).querySelector('meta[property="og:image"]'), null);
const tinyOg = new URL((await html('posts/tiny-test/index.html')).querySelector('meta[property="og:image"]').getAttribute('content'));
const tinySize = await sharp(resolve(fixture, 'dist', tinyOg.pathname.replace('/mayb-log/', ''))).metadata();
assert.equal(tinySize.width, 320);
assert.equal(tinySize.height, 168);
assert.equal((await html('posts/archive-note/index.html')).querySelector('meta[name="robots"]').getAttribute('content'), 'noindex,follow');
const rss = await readFile(resolve(fixture, 'dist/rss.xml'), 'utf8');
assert.ok(rss.includes('archive-note') && !rss.includes('Draftsentinel'));
const sitemap = await readFile(resolve(fixture, 'dist/sitemap-0.xml'), 'utf8');
assert.ok(!sitemap.includes('archive-note') && !sitemap.includes('draft-test') && sitemap.includes('validation'));

await remove('src/content/posts');
await mkdir(resolve(fixture, 'src/content/posts'), { recursive: true });
await build('empty-blog');
assert.match((await html('posts/index.html')).body.textContent, /아직 작성된 글이 없습니다/);
assert.ok(!(await readFile(resolve(fixture, 'dist/rss.xml'), 'utf8')).includes('<item>'));
const indexed = run('node_modules/pagefind/lib/runner/bin.cjs', ['--site', 'dist']);
assert.equal(indexed.status, 0, indexed.output);
console.log(`Verified ${failures.length} invalid content cases, publication rules and an empty blog (including Pagefind).`);
// Leave a complete isolated site for the browser suite, even after real samples are deleted.
await remove('src/content');
await seedTestContent(fixture);
await build('browser-fixture');
const browserIndex = run('node_modules/pagefind/lib/runner/bin.cjs', ['--site', 'dist']);
assert.equal(browserIndex.status, 0, browserIndex.output);
