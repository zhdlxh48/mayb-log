import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../../src/services/markdown.js";

test("server Markdown escapes raw HTML but permits sanitized iframe HTML", () => {
  const normal = renderMarkdown(
    "[external](https://example.com) [relative](../next) [anchor](#part)\n\n![remote](https://example.com/a.png)\n\n<div>Test</div>\n\n<script>alert(1)</script>",
  ).bodyHtml;
  assert.match(normal, /href="https:\/\/example.com"/);
  assert.match(normal, /href="\.\.\/next"/);
  assert.match(normal, /href="#part"/);
  assert.match(normal, /src="https:\/\/example.com\/a.png"/);
  assert.match(normal, /&lt;div&gt;Test&lt;\/div&gt;/);
  assert.doesNotMatch(normal, /<script>/);

  const frame = renderMarkdown(
    '<iframe src="https://player.example/video" title="Video" loading="lazy" sandbox="allow-scripts" srcdoc="bad" onload="bad()" style="color:red"></iframe>',
  ).bodyHtml;
  assert.match(frame, /<iframe/);
  assert.match(frame, /src="https:\/\/player.example\/video"/);
  assert.doesNotMatch(frame, /srcdoc|onload|style=/);
  assert.doesNotMatch(
    renderMarkdown('<iframe src="javascript:alert(1)"></iframe>').bodyHtml,
    /src=/,
  );
});
