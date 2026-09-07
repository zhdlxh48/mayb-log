import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonLd, xmlText } from '../src/lib/seo.ts';

test('metadata serialization cannot close a script or break XML', () => {
  const title = '</script><script>alert("hello")</script> & 한글';
  const serialized = jsonLd({ title });
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), { title });
  assert.equal(xmlText('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
});
