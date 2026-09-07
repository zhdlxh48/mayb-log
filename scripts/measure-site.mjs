import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.TEST_URL ?? 'https://zhdlxh48.github.io/mayb-log/';
const browser = await chromium.launch();
const results = [];
for (const width of [375, 1440]) {
  for (const path of ['', 'posts/', 'posts/first-note/', 'search/']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const metrics = { lcp: 0, cls: 0 };
      window['siteMetrics'] = metrics;
      new PerformanceObserver(list => {
        metrics.lcp = list.getEntries().at(-1).startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) metrics.cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(new URL(path, base).href);
    await page.waitForTimeout(800);
    const metrics = await page.evaluate(() => ({
      ...window['siteMetrics'],
      resources: performance.getEntriesByType('resource').map(entry => ({
        path: new URL(entry.name).pathname, type: entry.initiatorType, bytes: entry.encodedBodySize,
      })),
    }));
    results.push({ path: path || '/', width, ...metrics });
    await context.close();
  }
}
const report = { measuredAt: new Date().toISOString(), base, browser: browser.version(), conditions: 'Windows; new browser context per page; no CPU/network throttling; laboratory measurements, not field Core Web Vitals', results };
await browser.close();
await mkdir('docs/verification', { recursive: true });
await writeFile('docs/verification/performance.json', JSON.stringify(report, null, 2) + '\n');
console.log(results.map(({ path, width, lcp, cls, resources }) => ({ path, width, lcp: Math.round(lcp), cls, resourceBytes: resources.reduce((sum, resource) => sum + resource.bytes, 0) })));
