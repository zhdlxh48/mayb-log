import assert from "node:assert/strict";
import test from "node:test";
import { encodedPost, login } from "../helpers/auth.js";
import { resetDatabase, sql } from "../helpers/database.js";
import { origin, withWorker } from "../helpers/worker.js";

test("series and categories keep mutation controls inside protected edit pages", () =>
  withWorker(async () => {
    resetDatabase();
    const auth = await login();
    assert.equal(
      (
        await encodedPost(
          "/series/create",
          { csrf: auth.csrf, title: "Integration Series" },
          auth.cookie,
        )
      ).status,
      303,
    );
    assert.equal(
      (
        await encodedPost(
          "/categories/create",
          { csrf: auth.csrf, name: "Integration Category" },
          auth.cookie,
        )
      ).status,
      303,
    );
    for (const [kind, id] of [
      ["series", sql("SELECT id FROM series WHERE title = 'Integration Series'")[0].id],
      ["categories", sql("SELECT id FROM categories WHERE name = 'Integration Category'")[0].id],
    ]) {
      const html = await (
        await fetch(`${origin}/${kind}/${id}/edit`, { headers: { Cookie: auth.cookie } })
      ).text();
      assert.match(html, /name="csrf" value="[^"]+"/);
      assert.match(html, /data-confirm=/);
      assert.doesNotMatch(html, /onsubmit=/);
      assert.equal(
        (await encodedPost(`/${kind}/${id}/delete`, { csrf: auth.csrf }, auth.cookie)).status,
        303,
      );
    }
  }));
