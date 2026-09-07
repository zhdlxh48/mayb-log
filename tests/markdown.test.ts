import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownConfigDefaults, unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import directives from '../src/lib/markdown/directives.ts';
import markdownLinks from '../src/lib/markdown/links.ts';

const renderer = await unified({ remarkPlugins: [remarkDirective, directives], rehypePlugins: [markdownLinks] }).createRenderer(markdownConfigDefaults);

test('nested details and normal GFM are preserved', async () => {
  const { code } = await renderer.render('::::details{summary="outer"}\n:::details{summary="inner"}\n**body**\n:::\n::::\n\n~~deleted~~\n\n- [x] done');
  assert.match(code, /<details[^>]*><summary>outer<\/summary>\s*<details/);
  assert.doesNotMatch(code, /:::/);
  assert.match(code, /<del>deleted<\/del>/);
  assert.match(code, /type="checkbox"/);
});

test('Markdown root links use base and preserve anchors, external links and files', async () => {
  const { code } = await renderer.render('[한글](/tags/기록/#목차) [rss](/rss.xml) [base](/mayb-log/posts/) [external](https://example.com/) [heading](#hello)');
  assert.match(code, /\/mayb-log\/tags\/%EA%B8%B0%EB%A1%9D\/#/);
  assert.match(code, /href="\/mayb-log\/rss.xml"/);
  assert.doesNotMatch(code, /mayb-log\/mayb-log/);
  assert.match(code, /href="https:\/\/example.com\/"/);
  assert.match(code, /href="#hello"/);
});
