import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('view selection persists between pages and reloads', async ({ page }) => {
  await page.goto('posts/');
  await expect(page.locator('[data-post-browser]')).toHaveAttribute('data-view', 'list');
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  const first = await page.locator('.post-item').nth(0).boundingBox();
  const second = await page.locator('.post-item').nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second!.x).toBeGreaterThan(first!.x + first!.width / 2);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Grid', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('tags/astro/');
  await expect(page.locator('[data-post-browser]')).toHaveAttribute('data-view', 'grid');
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

test('FlexSearch finds Korean and English substrings, noindex posts and empty results', async ({
  page,
}) => {
  await page.goto('search/');
  for (const query of ['ark', '절한', '날짜']) {
    await page.getByRole('searchbox').fill(query);
    await expect(page.locator('#search-status')).toContainText('개의 검색 결과');
    await expect(page.locator('#search-results a').first()).toHaveAttribute(
      'href',
      /^\/mayb-log\//,
    );
  }
  await expect(page.locator('#search-results a[href$="/posts/archive-note/"]')).toHaveCount(1);
  await page.getByRole('searchbox').fill('zznoresultszz');
  await expect(page.locator('#search-status')).toHaveText('검색 결과가 없습니다.');
});

test('search explains a failed corpus request', async ({ page }) => {
  await page.route('**/search-data/', (route) => route.abort());
  await page.goto('search/');
  await page.getByRole('searchbox').fill('Astro');
  await expect(page.locator('#search-status')).toContainText('검색을 불러오지 못했습니다');
});

test('MDX renders LinkPreview, a lazy iframe and processed local images', async ({ page }) => {
  await page.route('**://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.goto('posts/markdown-notes/');
  await expect(page.locator('.link-preview')).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute('loading', 'lazy');
  await expect(page.getByAltText('작은 이미지 처리 예시')).toHaveAttribute('srcset', /\.webp/);
});

test('navigation and nested details work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('.mobile-index')).not.toHaveAttribute('open');
  await page.locator('.mobile-index > summary').click();
  await page.locator('.mobile-index').getByRole('link', { name: '전체 글', exact: false }).click();
  await expect(page.locator('.post-list > li')).toHaveCount(3);
  for (const path of [
    'tags/',
    'categories/개발/',
    'series/blog-notes/',
    'archive/',
    'archive/2026/09/',
    'authors/owner/',
  ]) {
    await page.goto(new URL(path, baseURL).href);
    await expect(page.locator('main h1')).toBeVisible();
  }
  await page.goto(new URL('posts/first-note/', baseURL).href);
  const details = page.locator('.prose > details');
  await details.locator(':scope > summary').click();
  await expect(details.locator('details')).toHaveCount(1);
  await details.locator('details > summary').click();
  await expect(details.locator('details p')).toBeVisible();
  await context.close();
});

test('long titles, code and tables stay inside the viewport', async ({ page }) => {
  await page.goto('posts/markdown-notes/');
  await page.evaluate(() => {
    document.querySelector('h1')!.textContent = '아주긴제목'.repeat(25);
    const code = document.createElement('pre');
    code.textContent = 'const veryLongIdentifier = '.repeat(50);
    document.querySelector('.prose')!.append(code);
    document.querySelector('td')!.textContent = 'LongTableContent'.repeat(40);
  });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.locator('pre').evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(
      true,
    );
  }
});

test('layouts fit four widths and meet automated accessibility checks', async ({
  page,
}, testInfo) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['', 'posts/', 'posts/first-note/', 'search/']) {
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
      if (testInfo.project.name === 'chromium' && (width === 375 || width === 1440)) {
        await page.screenshot({
          path: testInfo.outputPath(`${width}-${path.replaceAll('/', '-') || 'about'}.png`),
          fullPage: true,
        });
      }
    }
  }
});

test('article body and TOC are centered together on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('posts/first-note/');
  const article = await page.locator('article').boundingBox();
  const main = await page.locator('main').boundingBox();
  expect(article).not.toBeNull();
  expect(main).not.toBeNull();
  expect(Math.abs(article!.x + article!.width / 2 - (main!.x + main!.width / 2))).toBeLessThan(2);
  await expect(page.getByText('목차', { exact: true })).toBeVisible();
});

test('non-search pages do not load the search worker or corpus', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('./');
  expect(requests.some((request) => /search-data|search\.worker|flexsearch/.test(request))).toBe(
    false,
  );
});

test('keyboard skip link and direct Unicode routes work', async ({ page }) => {
  await page.goto('categories/개발/');
  await page.reload();
  await expect(page.locator('h1')).toContainText('개발');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});
