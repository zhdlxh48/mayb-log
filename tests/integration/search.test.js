import assert from "node:assert/strict";
import test from "node:test";
import { resetDatabase } from "../helpers/database.js";
import { origin, withWorker } from "../helpers/worker.js";

test("search keeps static filter semantics and redirects invalid pages canonically", () =>
  withWorker(async () => {
    resetDatabase();
    assert.match(await (await fetch(`${origin}/search?q=Worker`)).text(), /Express와 EJS/);
    assert.match(await (await fetch(`${origin}/search?q=기록`)).text(), /서울 시간/);
    assert.match(
      await (
        await fetch(`${origin}/search?series=1&category=1&tag=Cloudflare&tag=D1,js%20lang`)
      ).text(),
      /Express와 EJS/,
    );
    assert.doesNotMatch(
      await (await fetch(`${origin}/search?category=1&category=2`)).text(),
      /class="post-row"/,
    );
    assert.doesNotMatch(await (await fetch(`${origin}/search?q=%25`)).text(), /class="post-row"/);
    const redirect = await fetch(`${origin}/search?q=Worker&tag=D1&page=999`, {
      redirect: "manual",
    });
    assert.equal(redirect.status, 303);
    assert.equal(redirect.headers.get("location"), "/search?q=Worker&tag=D1");
    assert.equal(
      (await fetch(`${origin}/posts?page=999`, { redirect: "manual" })).headers.get("location"),
      "/posts",
    );
    assert.equal(
      (await fetch(`${origin}/search?page=0`, { redirect: "manual" })).headers.get("location"),
      "/search",
    );
    const archive = await (await fetch(`${origin}/archive`)).text();
    assert.match(archive, /to=2026-09-30/);
  }));
