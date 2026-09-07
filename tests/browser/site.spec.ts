import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('view selection persists between pages and reloads', async ({ page }) => {
  await page.goto('posts/');
  await expect(page.locator('[data-post-browser]')).toHaveAttribute('data-view', 'list');
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Grid', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('tags/astro/');
  await expect(page.locator('[data-post-browser]')).toHaveAttribute('data-view', 'grid');
});

test('blocked storage does not break the toggle', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  await page.goto('posts/');
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await expect(page.locator('[data-post-browser]')).toHaveAttribute('data-view', 'grid');
});

test('search supports Korean, English, no results and noindex posts', async ({ page }) => {
  await page.goto('search/');
  for (const query of ['Astro', '기록']) {
    await page.getByRole('searchbox').fill(query);
    await expect(page.locator('#search-status')).toContainText('개의 검색 결과');
    await expect(page.locator('#search-results a').first()).toHaveAttribute('href', /^\/mayb-log\//);
  }
  await expect(page.locator('#search-results a[href$="/posts/archive-note/"]')).toHaveCount(1);
  await page.getByRole('searchbox').fill('zznoresultszz');
  await expect(page.locator('#search-status')).toHaveText('검색 결과가 없습니다.');
});

test('search explains a failed module request', async ({ page }) => {
  await page.route('**/pagefind/pagefind.js', route => route.abort());
  await page.goto('search/');
  await page.getByRole('searchbox').fill('Astro');
  await expect(page.locator('#search-status')).toContainText('검색을 불러오지 못했습니다');
});

test('YouTube creates an iframe only after a click', async ({ page }) => {
  await page.route('**://www.youtube-nocookie.com/**', route => route.fulfill({ body: '<html><title>Test video</title></html>', contentType: 'text/html' }));
  await page.goto('posts/first-note/');
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.locator('[data-youtube] button').click();
  await expect(page.locator('[data-youtube] iframe')).toHaveAttribute('src', /youtube-nocookie.com\/embed\/aqz-KE-bpKQ/);
});

test('navigation and nested details work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('.mobile-index')).not.toHaveAttribute('open');
  await page.locator('.mobile-index > summary').click();
  await page.locator('.mobile-index').getByRole('link', { name: '전체 글', exact: false }).click();
  await expect(page.locator('.post-list > li')).toHaveCount(3);
  for (const path of ['tags/', 'categories/개발/', 'series/blog-notes/', 'archive/', 'archive/2026/09/', 'authors/owner/']) {
    await page.goto(new URL(path, baseURL).href);
    await expect(page.locator('main h1')).toBeVisible();
  }
  await page.goto(new URL('posts/first-note/', baseURL).href);
  const details = page.locator('.prose > details');
  await details.locator(':scope > summary').click();
  await expect(details.locator('details')).toHaveCount(1);
  await details.locator('details > summary').click();
  await expect(details.locator('details p')).toBeVisible();
  await expect(page.locator('[data-youtube] a')).toBeVisible();
  await expect(page.locator('[data-youtube] button')).toBeHidden();
  await context.close();
});

test('long titles, code and tables scroll within the content', async ({ page }) => {
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('pre').evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  }
});

test('layouts fit four widths and remain accessible', async ({ page }, testInfo) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['', 'posts/', 'posts/first-note/', 'search/']) {
      await page.goto(path || './');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
      if (testInfo.project.name === 'chromium' && (width === 375 || width === 1440)) {
        await page.screenshot({ path: testInfo.outputPath(`${width}-${path.replaceAll('/', '-') || 'about'}.png`), fullPage: true });
      }
    }
  }
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
