import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageOptions, ogDimensions } from '../../src/lib/images.ts';

test('all raster sizes cap the long edge without upscaling', () => {
  for (const [width, height] of [
    [2400, 1200],
    [2400, 1800],
    [1600, 1000],
    [1200, 900],
    [900, 2400],
    [320, 240],
  ]) {
    const result = imageOptions({ width: width!, height: height! });
    assert.ok(result.width <= width! && result.height <= height!);
    assert.ok(Math.max(result.width, result.height) <= 1600);
    assert.ok(result.widths.every((value) => value <= result.width));
    assert.equal(result.format, 'webp');
    assert.equal(result.quality, 80);
  }
  assert.deepEqual(imageOptions({ width: 900, height: 2400 }).widths, [480, 600]);
  assert.equal(imageOptions({ width: 640, height: 160, format: 'svg' }).format, 'svg');
});
test('OG dimensions preserve target ratio without enlarging small originals', () => {
  assert.deepEqual(ogDimensions({ width: 2400, height: 1200 }), { width: 1200, height: 630 });
  assert.deepEqual(ogDimensions({ width: 320, height: 240 }), { width: 320, height: 168 });
});
