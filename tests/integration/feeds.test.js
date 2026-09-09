import assert from "node:assert/strict";
import test from "node:test";
import { resetDatabase } from "../helpers/database.js";
import { origin, withWorker } from "../helpers/worker.js";

test("RSS, Sitemap, and robots expose only their intended public documents", () =>
  withWorker(async () => {
    resetDatabase();
    const rss = await (await fetch(`${origin}/rss.xml`)).text();
    const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
    assert.match(rss, /서울 시간/);
    assert.match(sitemap, /posts\/1/);
    assert.doesNotMatch(sitemap, /posts\/2/);
    assert.match(await (await fetch(`${origin}/robots.txt`)).text(), /Sitemap:/);
  }));
