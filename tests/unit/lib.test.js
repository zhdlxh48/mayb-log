import assert from "node:assert/strict";
import test from "node:test";
import { dateEpoch, positiveIds, requestedPage, uniqueText } from "../../src/lib.js";

test("common input helpers normalize values", () => {
  assert.equal(dateEpoch("2026-01-01"), 1767193200);
  assert.equal(requestedPage(undefined), 1);
  assert.equal(requestedPage("0"), 0);
  assert.deepEqual(positiveIds(["2", "2", "x", "-1"]), [2]);
  assert.deepEqual(uniqueText(["a,b", "b", " c "]), ["a", "b", "c"]);
});
