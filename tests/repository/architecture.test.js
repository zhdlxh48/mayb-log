import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("runtime SQL lives in query modules and update reads only identity", async () => {
  const modules = await Promise.all(
    ["archive", "categories", "posts", "search", "series", "sessions", "users"].map((name) =>
      readFile(`src/db/${name}.js`, "utf8"),
    ),
  );
  for (const source of modules) {
    assert.doesNotMatch(source, /\.prepare\(\s*[`"']/i);
  }
  const identity = await readFile("src/db/queries/posts/find-id-and-uuid.sql", "utf8");
  assert.match(identity, /SELECT\s+id,\s+uuid/i);
  assert.doesNotMatch(identity, /body_|title|categories|tags/i);
});

test("views use domain directories without dead flat templates", async () => {
  const render = await readFile("src/render.js", "utf8");
  for (const path of [
    "layouts/base",
    "partials/common/head",
    "partials/posts/row",
    "posts/index",
    "series/index",
    "categories/index",
    "auth/login",
    "search/index",
  ]) {
    assert.match(render, new RegExp(path.replace("/", "\\/")));
  }
});
