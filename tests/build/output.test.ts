import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { parseHTML } from 'linkedom';
import sharp from 'sharp';
import { site } from '../../src/config/site.ts';

const root = resolve('dist');

test('the production output is complete and internally consistent', async () => {
  const files = await readdir(root, { recursive: true });
  const documents = new Map<string, Document>();
  const source = new Map<string, string>();

  for (const file of files.filter((name) => name.endsWith('.html'))) {
    const fullPath = resolve(root, file);
    const html = await readFile(fullPath, 'utf8');
    source.set(fullPath, html);
    documents.set(fullPath, parseHTML(html).document);
  }

  function localFile(address: URL) {
    assert.ok(address.pathname.startsWith(`${site.base}/`), `Missing base: ${address}`);
    const path = decodeURIComponent(address.pathname.slice(site.base.length + 1));
    const file = resolve(root, path, ...(path.endsWith('/') || !path ? ['index.html'] : []));
    assert.ok(file.startsWith(root + sep), `Path outside dist: ${address}`);
    return file;
  }

  let links = 0;
  const postDocuments: Document[] = [];
  for (const [file, document] of documents) {
    const path = relative(root, file)
      .split(sep)
      .join('/')
      .replace(/index\.html$/, '');
    const isSearchData = path === 'search-data/';
    const address = new URL(`${site.base}/${path}`, site.origin);
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');

    if (!isSearchData) assert.equal(canonical, address.href, `Canonical: ${path}`);
    assert.ok(document.querySelector('title')?.textContent, `Title: ${path}`);
    assert.ok(
      document.querySelector('meta[name="description"]')?.getAttribute('content'),
      `Description: ${path}`,
    );
    assert.equal(document.querySelectorAll('main').length, 1, `Main landmark: ${path}`);

    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    assert.equal(new Set(ids).size, ids.length, `Duplicate id: ${path}`);

    for (const element of document.querySelectorAll('[href], [src]')) {
      const value = element.getAttribute('href') ?? element.getAttribute('src');
      if (!value || /^(mailto:|tel:|data:)/.test(value)) continue;
      const target = new URL(value, address);
      if (target.origin !== site.origin) continue;
      const destination = localFile(target);
      assert.ok((await stat(destination)).isFile(), `Missing file: ${path} → ${value}`);
      if (target.hash && documents.has(destination)) {
        assert.ok(
          documents.get(destination)?.getElementById(decodeURIComponent(target.hash.slice(1))),
          `Missing anchor: ${path} → ${value}`,
        );
      }
      links++;
    }

    for (const image of document.querySelectorAll('img')) {
      assert.ok(image.hasAttribute('alt'), `Image alt: ${path}`);
      assert.ok(
        Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0,
        `Image dimensions: ${path}`,
      );
      for (const candidate of (image.getAttribute('srcset') ?? '').split(',').filter(Boolean)) {
        await stat(localFile(new URL(candidate.trim().split(/\s+/)[0], address)));
      }
    }

    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      const data = JSON.parse(script.textContent ?? '');
      assert.equal(data['@type'], 'BlogPosting');
      assert.equal(data.url, canonical);
      assert.ok(data.author.length && data.datePublished && data.dateModified);
      postDocuments.push(document);
    }
  }

  const sitemap = await readFile(resolve(root, 'sitemap-0.xml'), 'utf8');
  for (const [file, document] of documents) {
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (!canonical) continue;
    const noindex = document
      .querySelector('meta[name="robots"]')
      ?.getAttribute('content')
      ?.includes('noindex');
    assert.equal(sitemap.includes(`<loc>${canonical}</loc>`), !noindex, `Sitemap: ${file}`);
  }

  assert.match(await readFile(resolve(root, 'rss.xml'), 'utf8'), /<rss[\s>]/);
  assert.ok(!files.some((file) => file.includes('pagefind')), 'Pagefind output must be absent');
  assert.ok(
    ![...source.values()].some((html) => /data-pagefind|remark-directive/.test(html)),
    'removed search and directive hooks must be absent',
  );

  for (const document of postDocuments) {
    assert.ok(document.querySelector('meta[property="article:published_time"]'));
    assert.ok(document.querySelector('meta[name="twitter:card"]'));
  }

  const featureDocument = postDocuments.find(
    (document) =>
      document.querySelector('.link-preview') &&
      document.querySelector('iframe') &&
      document.querySelector('.prose img[srcset*=".webp"]'),
  );
  if (featureDocument) {
    assert.ok(featureDocument.querySelector('.link-preview'), 'MDX LinkPreview');
    assert.match(
      featureDocument.querySelector('.prose img[srcset*=".webp"]')?.getAttribute('srcset') ?? '',
      /\.webp/,
    );
  }

  for (const iframe of postDocuments.flatMap((document) => [
    ...document.querySelectorAll('iframe'),
  ])) {
    assert.equal(iframe.getAttribute('loading'), 'lazy', 'iframe lazy loading');
    assert.ok(iframe.getAttribute('title')?.trim(), 'iframe title');
    if (/youtube(?:-nocookie)?\.com/.test(iframe.getAttribute('src') ?? '')) {
      assert.match(iframe.getAttribute('class') ?? '', /\baspect-video\b/);
      assert.match(iframe.getAttribute('class') ?? '', /\bw-full\b/);
    }
  }

  for (const file of files.filter((name) => name.endsWith('.webp'))) {
    const metadata = await sharp(resolve(root, file)).metadata();
    assert.ok(Math.max(metadata.width ?? 0, metadata.height ?? 0) <= 1600, `Image: ${file}`);
  }

  const searchData = await readFile(resolve(root, 'search-data/index.html'));
  console.log(
    `Search corpus: ${searchData.byteLength} bytes raw, ${gzipSync(searchData).byteLength} bytes gzip.`,
  );
  console.log(`Verified ${documents.size} pages and ${links} internal references.`);
});
