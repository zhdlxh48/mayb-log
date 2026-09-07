import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { parseHTML } from 'linkedom';
import sharp from 'sharp';
import { site } from '../src/config/site.ts';

const root = resolve('dist');
const files = await readdir(root, { recursive: true });
const documents = new Map();
for (const file of files.filter(file => file.endsWith('.html'))) {
  documents.set(resolve(root, file), parseHTML(await readFile(resolve(root, file), 'utf8')).document);
}

function localFile(address) {
  assert.ok(address.pathname.startsWith(`${site.base}/`), `Missing base: ${address}`);
  const path = decodeURIComponent(address.pathname.slice(site.base.length + 1));
  const file = resolve(root, path, ...(path.endsWith('/') || !path ? ['index.html'] : []));
  assert.ok(file.startsWith(root + sep), `Path outside dist: ${address}`);
  return file;
}

let links = 0;
for (const [file, document] of documents) {
  const path = relative(root, file).split(sep).join('/').replace(/index\.html$/, '');
  const address = new URL(`${site.base}/${path}`, site.origin);
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
  assert.equal(canonical, address.href, `Canonical: ${path}`);
  assert.ok(document.querySelector('title')?.textContent, `Title: ${path}`);
  assert.ok(document.querySelector('meta[name="description"]')?.getAttribute('content'), `Description: ${path}`);
  assert.equal(document.querySelectorAll('main').length, 1, `Main landmark: ${path}`);
  const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(new Set(ids).size, ids.length, `Duplicate id: ${path}`);
  for (const element of document.querySelectorAll('[href], [src]')) {
    const value = element.getAttribute('href') ?? element.getAttribute('src');
    if (!value || /^(mailto:|tel:|data:)/.test(value)) continue;
    const target = new URL(value, address);
    if (target.origin !== site.origin) continue;
    const destination = localFile(target);
    assert.ok((await stat(destination)).isFile(), `Missing file: ${path} → ${value}`);
    if (target.hash && documents.has(destination)) {
      assert.ok(documents.get(destination).getElementById(decodeURIComponent(target.hash.slice(1))), `Missing anchor: ${path} → ${value}`);
    }
    links++;
  }
  for (const image of document.querySelectorAll('img')) {
    assert.ok(image.hasAttribute('alt'), `Image alt: ${path}`);
    assert.ok(Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0, `Image dimensions: ${path}`);
    for (const candidate of (image.getAttribute('srcset') ?? '').split(',').filter(Boolean)) {
      await stat(localFile(new URL(candidate.trim().split(/\s+/)[0], address)));
    }
  }
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    const data = JSON.parse(script.textContent);
    assert.equal(data['@type'], 'BlogPosting');
    assert.equal(data.url, canonical);
    assert.ok(data.author.length && data.datePublished && data.dateModified);
  }
}

const sitemap = await readFile(resolve(root, 'sitemap-0.xml'), 'utf8');
for (const [file, document] of documents) {
  const canonical = document.querySelector('link[rel="canonical"]').getAttribute('href');
  const noindex = document.querySelector('meta[name="robots"]')?.getAttribute('content').includes('noindex');
  assert.equal(sitemap.includes(`<loc>${canonical}</loc>`), !noindex, `Sitemap inclusion: ${file}`);
}
assert.match(await readFile(resolve(root, 'rss.xml'), 'utf8'), /<rss[\s>]/);
await stat(resolve(root, 'pagefind/pagefind.js'));
for (const file of files.filter(file => file.endsWith('.webp'))) {
  const metadata = await sharp(resolve(root, file)).metadata();
  assert.ok(Math.max(metadata.width, metadata.height) <= 1600, `Oversized image: ${file}`);
}
console.log(`Verified ${documents.size} HTML pages, ${links} internal references, images, JSON-LD, RSS, Sitemap and Pagefind.`);
