import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownConfigDefaults, unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import directives from '../src/lib/markdown/directives.ts';

const renderer = await unified({ remarkPlugins: [remarkDirective, directives] }).createRenderer(markdownConfigDefaults);
test('all directives render semantic static HTML', async () => {
  const result = await renderer.render([
    ':::callout{type="warning" title="주의"}\n본문\n:::',
    ':::details{summary="더 보기"}\n내용\n:::',
    ':::figure{caption="그림" credit="MayB"}\n![설명](./image.jpg)\n:::',
    '::social{platform="github" url="https://github.com/zhdlxh48" label="GitHub"}',
    '::link-card{url="https://example.com" title="Example" description="소개"}',
    '::metric{label="LCP" value="1.2" unit="s" status="good"}',
    '::youtube{id="aqz-KE-bpKQ" title="영상"}',
  ].join('\n\n'));
  for (const tag of ['aside', 'details', 'summary', 'figure', 'figcaption', 'dl', 'dt', 'dd']) assert.match(result.code, new RegExp(`<${tag}[ >]`));
  assert.match(result.code, /data-youtube/);
  assert.doesNotMatch(result.code, /<iframe/);
});
test('invalid names, required attributes, values and protocols fail', async (t) => {
  t.mock.method(console, 'error', () => {});
  for (const markdown of ['::yotube{}', '::youtube{title="missing"}', '::youtube{id="bad" title="bad"}', '::metric{label="x" value="1" status="oops"}', '::link-card{url="javascript:alert(1)" title="bad"}', ':::details\ntext\n:::']) {
    await assert.rejects(renderer.render(markdown));
  }
});
test('directive attributes are escaped and fenced examples remain code', async () => {
  const result = await renderer.render('::link-card{url="https://example.com" title="<script>alert(1)</script>"}\n\n```md\n::unknown{}\n```');
  assert.doesNotMatch(result.code, /<script>alert/);
  assert.match(result.code, /(?:&lt;|&#x3C;)script/);
});
