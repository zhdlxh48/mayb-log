import assert from "node:assert/strict";
import test from "node:test";
import { escapeLike, ftsPhrase, parseSearch, searchParams } from "../../src/search.js";

test("search filters retain AND/OR inputs and use an inclusive To date", () => {
  const filters = parseSearch({
    q: "기록",
    series: ["3", "8"],
    category: ["2", "4"],
    tag: ["Cloudflare,D1", "D1", "js lang"],
    from: "2026-12-01",
    to: "2026-12-31",
    page: "13",
  });
  assert.deepEqual(filters.series, [3, 8]);
  assert.deepEqual(filters.categories, [2, 4]);
  assert.deepEqual(filters.tags, ["Cloudflare", "D1", "js lang"]);
  assert.equal(filters.toEpoch, 1798729200);
  assert.equal(searchParams(filters, 13).getAll("tag").length, 3);
  assert.equal(ftsPhrase('a"b'), '"a""b"');
  assert.equal(escapeLike("50%_done\\"), "50\\%\\_done\\\\");
});
