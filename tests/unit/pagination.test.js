import assert from "node:assert/strict";
import test from "node:test";
import { pageBlock } from "../../src/lib.js";

test("pagination uses actual ten-page blocks", () => {
  assert.deepEqual(pageBlock(1, 0).pages, [1]);
  assert.deepEqual(pageBlock(1, 60).pages, [1, 2, 3]);
  assert.equal(pageBlock(3, 500).next, 11);
  assert.equal(pageBlock(13, 500).previous, 10);
  assert.equal(pageBlock(13, 500).next, 21);
  assert.equal(pageBlock(27, 540).last, 27);
  assert.equal(pageBlock(27, 540).next, null);
});
