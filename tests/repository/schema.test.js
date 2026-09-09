import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("schema keeps the small D1 model and explicit contentless trigram FTS", async () => {
  const schema = await readFile("migrations/0001_initial.sql", "utf8");
  assert.match(schema, /contentless_delete\s*=\s*1/);
  assert.match(schema, /tokenize\s*=\s*'trigram'/);
  assert.doesNotMatch(
    schema,
    /\brole\b|post_images|CREATE TABLE tags|CREATE TABLE pages|\bslug\b/i,
  );
  assert.doesNotMatch(schema, /CREATE TRIGGER/i);
});
