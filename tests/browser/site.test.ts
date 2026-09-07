import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

interface CorpusEntry {
  url: string;
  title: string;
  subtitle: string;
  description: string;
  authors: string[];
  series: string;
  categories: string[];
  tags: string[];
  body: string;
  noindex: boolean;
}

async function getCorpus(page: Page) {
  await page.goto('search/');
  const entries = await page.evaluate(async () => {
    const source =
      document.querySelector<HTMLElement>('[data-search-source]')!.dataset.searchSource!;
    const html = await (await fetch(source)).text();
    const corpus = new DOMParser().parseFromString(html, 'text/html');
    const list = (value: string | undefined) => (value ? JSON.parse(value) : []);
    return [...corpus.querySelectorAll<HTMLElement>('[data-search-document]')]
      .filter((element) => element.dataset.kind === 'post')
      .map((element) => ({
        url: element.dataset.url!,
        title: element.dataset.title!,
        subtitle: element.dataset.subtitle ?? '',
        description: element.dataset.description ?? '',
        authors: list(element.dataset.authors),
        series: element.dataset.series ?? '',
        categories: list(element.dataset.categories),
        tags: list(element.dataset.tags),
        body: element.querySelector('[data-search-body]')?.textContent ?? '',
        noindex: element.dataset.noindex === 'true',
      }));
  });
  return entries as CorpusEntry[];
}

async function searchFor(page: Page, query: string, expectedUrl: string) {
  await page.getByRole('searchbox').fill(query);
  await expect(page.locator('#search-status')).toContainText('개의 검색 결과');
  await expect(page.locator(`#search-results a[href="${expectedUrl}"]`)).toHaveCount(1);
}

function absentFrom(value: string, others: string[]) {
  const normalized = others.join(' ').toLocaleLowerCase();
  const words = value.match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  return words
    .sort((a, b) => b.length - a.length)
    .find((word) => !normalized.includes(word.toLocaleLowerCase()));
}

test('view selection persists between pages and reloads', async ({ page }) => {
  await page.goto('posts/');
  await expect(page.locator('[data-post-browser]')).toHaveAttribute('data-view', 'list');
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  const items = page.locator('.post-item');
  if ((await items.count()) > 1) {
    const first = await items.nth(0).boundingBox();
    const second = await items.nth(1).boundingBox();
    expect(second!.x).toBeGreaterThan(first!.x + first!.width / 2);
  }
  await page.reload();
  await expect(page.getByRole('button', { name: 'Grid', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const categoryLink = page.locator('.post-item a[href*="/categories/"]').first();
  const category = (await categoryLink.count()) ? await categoryLink.getAttribute('href') : null;
  if (category) {
    await page.goto(category);
    await expect(page.locator('[data-post-browser]')).toHaveAttribute('data-view', 'grid');
  }
});

test('blocked storage does not break the view toggle', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    }),
  );
  await page.goto('posts/');
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await expect(page.locator('[data-post-browser]')).toHaveAttribute('data-view', 'grid');
});

test('production search indexes every post field and supports infix queries', async ({ page }) => {
  const posts = await getCorpus(page);
  const markdown = posts.find((post) => post.title.toLocaleLowerCase().includes('markdown'));
  if (markdown) {
    await searchFor(page, 'down', markdown.url);
    await searchFor(page, 'ark', markdown.url);
  }

  const korean = posts.find((post) => /[가-힣]{4,}/.test(post.description));
  if (korean) {
    const match = korean.description.match(/[가-힣]{4,}/)![0];
    await searchFor(page, match.slice(1, 4), korean.url);
  }

  for (const field of ['description', 'authors', 'series', 'body'] as const) {
    const match = posts
      .map((post) => {
        const value = Array.isArray(post[field]) ? post[field].join(' ') : post[field];
        const others = [
          post.title,
          post.subtitle,
          post.description,
          post.authors.join(' '),
          post.series,
          post.categories.join(' '),
          post.tags.join(' '),
          post.body,
        ].filter((entry) => entry !== value);
        return { post, query: absentFrom(value, others) };
      })
      .find((entry) => entry.query);
    if (posts.length) expect(match, `${field} 전용 검색어`).toBeDefined();
    if (match?.query) await searchFor(page, match.query, match.post.url);
  }

  const noindex = posts.find((post) => post.noindex);
  if (noindex) await searchFor(page, noindex.title, noindex.url);
  await page.getByRole('searchbox').fill('zznoresultszz');
  await expect(page.locator('#search-status')).toHaveText('검색 결과가 없습니다.');
});

test('search retries a failed corpus request without reloading', async ({ page }) => {
  const posts = await getCorpus(page);
  const target = posts[0];
  if (!target) return;

  await page.route('**/search-data/', (route) => route.abort());
  await page.getByRole('searchbox').fill(target.title);
  await expect(page.locator('#search-status')).toContainText('검색을 불러오지 못했습니다');
  await page.unroute('**/search-data/');
  await page.getByRole('searchbox').fill('');
  await searchFor(page, target.title, target.url);
});

test('available MDX features keep previews, iframe metadata and processed images', async ({
  page,
}) => {
  const posts = await getCorpus(page);
  let featureUrl: string | undefined;
  for (const post of posts) {
    await page.goto(post.url);
    if (
      (await page.locator('.link-preview').count()) &&
      (await page.locator('iframe').count()) &&
      (await page.locator('.prose img[srcset*=".webp"]').count())
    ) {
      featureUrl = post.url;
      break;
    }
  }
  if (!featureUrl) return;

  await expect(page.locator('.link-preview')).toBeVisible();
  const iframe = page.locator('iframe').first();
  await expect(iframe).toHaveAttribute('loading', 'lazy');
  await expect(iframe).toHaveAttribute('title', /.+/);
  if (/youtube/.test((await iframe.getAttribute('src')) ?? '')) {
    await expect(iframe).toHaveClass(/aspect-video/);
    await expect(iframe).toHaveClass(/w-full/);
  }
  await expect(page.locator('.prose img[srcset*=".webp"]').first()).toBeVisible();
});

test('navigation and available details work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('.mobile-index')).not.toHaveAttribute('open');
  await page.locator('.mobile-index > summary').click();
  await page.locator('.mobile-index').getByRole('link', { name: '전체 글', exact: false }).click();
  const itemCount = await page.locator('.post-list > li').count();
  await expect(page.locator('[data-post-browser] > div > span')).toHaveText(`${itemCount}개의 글`);
  if (!itemCount) await expect(page.getByText('아직 작성된 글이 없습니다.')).toBeVisible();

  for (const path of ['tags/', 'categories/', 'series/', 'archive/']) {
    await page.goto(new URL(path, baseURL).href);
    await expect(page.locator('main h1')).toBeVisible();
  }

  const posts = await getCorpus(page);
  for (const post of posts) {
    await page.goto(post.url);
    const authorLink = page.locator('a[rel="author"]').first();
    if (await authorLink.count()) {
      const authorUrl = await authorLink.getAttribute('href');
      await page.goto(authorUrl!);
      await expect(page.locator('main h1')).toBeVisible();
      const homepage = page.locator('main a[href^="http"]').first();
      if (await homepage.count()) await expect(homepage).toHaveClass(/text-accent/);
      await page.goto(post.url);
    }
    const details = page.locator('.prose details').first();
    if (await details.count()) {
      await details.locator(':scope > summary').click();
      await expect(details).toHaveAttribute('open', '');
      break;
    }
  }
  await context.close();
});

test('long titles, code and tables stay inside six viewport widths', async ({ page }) => {
  const posts = await getCorpus(page);
  await page.goto(posts[0]?.url ?? './');
  await page.evaluate(() => {
    document.querySelector('h1')!.textContent = '아주긴제목'.repeat(25);
    const prose = document.querySelector('.prose') ?? document.querySelector('main')!;
    const code = document.createElement('pre');
    code.dataset.testLong = '';
    code.textContent = 'const veryLongIdentifier = '.repeat(50);
    const table = document.createElement('table');
    table.innerHTML = `<tbody><tr><td>${'LongTableContent'.repeat(40)}</td></tr></tbody>`;
    prose.append(code, table);
  });
  for (const width of [375, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await page
        .locator('pre[data-test-long]')
        .evaluate((node) => node.scrollWidth > node.clientWidth),
    ).toBe(true);
  }
});

test('layouts fit six widths and meet automated accessibility checks', async ({
  page,
}, testInfo) => {
  const posts = await getCorpus(page);
  const paths = ['', 'posts/', 'search/', ...(posts[0] ? [posts[0].url] : [])];
  for (const width of [375, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(path || './');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        audit.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
      if (testInfo.project.name === 'chromium' && (width === 1920 || width === 2560)) {
        await page.screenshot({
          path: testInfo.outputPath(`${width}-${path.replaceAll('/', '-') || 'about'}.png`),
          fullPage: true,
        });
      }
    }
  }
});

test('article is centered in the viewport area beside the sidebar', async ({ page }) => {
  const posts = await getCorpus(page);
  if (!posts[0]) return;
  for (const width of [1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(posts[0].url);
    const centers = await page.evaluate(() => {
      const article = document.querySelector('article')!.getBoundingClientRect();
      const sidebar = document.querySelector('[data-site-sidebar]')!.getBoundingClientRect();
      return {
        article: article.left + article.width / 2,
        available: sidebar.right + (innerWidth - sidebar.right) / 2,
      };
    });
    expect(Math.abs(centers.article - centers.available)).toBeLessThan(2);
    await expect(page.getByText('목차', { exact: true })).toBeVisible();
  }
});

test('About and post pages do not load the search worker or corpus', async ({ page }) => {
  const posts = await getCorpus(page);
  for (const path of ['./', ...(posts[0] ? [posts[0].url] : [])]) {
    const requests: string[] = [];
    const collect = (request: { url(): string }) => requests.push(request.url());
    page.on('request', collect);
    await page.goto(path);
    page.off('request', collect);
    expect(requests.some((request) => /search-data|search\.worker|flexsearch/.test(request))).toBe(
      false,
    );
  }
});

test('keyboard skip link and a discovered Unicode route work', async ({ page }) => {
  await page.goto('categories/');
  const unicode = await page
    .locator('a[href*="/categories/"]')
    .evaluateAll((links) =>
      links
        .map((link) => (link as HTMLAnchorElement).href)
        .find((href) => [...decodeURI(href)].some((character) => character.codePointAt(0)! > 127)),
    );
  if (unicode) {
    await page.goto(unicode);
    await page.reload();
    await expect(page.locator('main h1')).toBeVisible();
  }
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});
