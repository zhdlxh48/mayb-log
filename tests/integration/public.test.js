import assert from "node:assert/strict";
import test from "node:test";
import { resetDatabase } from "../helpers/database.js";
import { origin, withWorker } from "../helpers/worker.js";

test("public routes and navigation remain available without session lookups", () =>
  withWorker(async () => {
    resetDatabase();
    for (const path of [
      "/",
      "/posts",
      "/posts/1",
      "/series",
      "/categories",
      "/archive",
      "/search",
      "/login",
      "/signup",
    ]) {
      assert.equal((await fetch(origin + path)).status, 200, path);
    }
    const detail = await (await fetch(`${origin}/posts/1`)).text();
    assert.match(detail, />Edit<\/a>/);
    assert.doesNotMatch(detail, /data-delete-post|post-delete\.js|>X<|>Delete</);
    const navigation = await (
      await fetch(`${origin}/posts`, { headers: { Cookie: "session=fake" } })
    ).text();
    assert.match(navigation, />Profile<\/a>/);
    assert.doesNotMatch(navigation, />Tags<|>Sign up<|popover|dropdown/);
  }));
