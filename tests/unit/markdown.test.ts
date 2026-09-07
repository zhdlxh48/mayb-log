import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownConfigDefaults, unified } from '@astrojs/markdown-remark';
import markdownLinks from '../../src/lib/markdown/links.ts';

const renderer = await unified({ rehypePlugins: [markdownLinks] }).createRenderer(
  markdownConfigDefaults,
);

test('GFM and syntax highlighting remain available', async () => {
  const { code } = await renderer.render(
    '~~deleted~~\n\n- [x] done\n\n```ts\nconst greeting: string = "hello";\n```',
  );
  assert.match(code, /<del>deleted<\/del>/);
  assert.match(code, /type="checkbox"/);
  assert.match(code, /class="astro-code /);
});

test('Markdown root links use base and preserve anchors, external links and files', async () => {
  const { code } = await renderer.render(
    '[한글](/tags/기록/#목차) [rss](/rss.xml) [base](/mayb-log/posts/) [external](https://example.com/) [heading](#hello)',
  );
  assert.match(code, /\/mayb-log\/tags\/%EA%B8%B0%EB%A1%9D\/#/);
  assert.match(code, /href="\/mayb-log\/rss.xml"/);
  assert.doesNotMatch(code, /mayb-log\/mayb-log/);
  assert.match(code, /href="https:\/\/example.com\/"/);
  assert.match(code, /href="#hello"/);
});
