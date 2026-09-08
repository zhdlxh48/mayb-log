import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dateEpoch, pageBlock, positiveIds, uniqueText } from "../src/lib.js";
import { escapeLike, ftsPhrase, parseSearch, searchQuery, searchParams } from "../src/db/search.js";
import { renderMarkdown } from "../src/services/markdown.js";
import { csrfCookie, passwordHash, sessionCookie, verifyPassword } from "../src/services/security.js";
import { imageKey, validateImages } from "../src/services/images.js";

test("Markdown escapes raw HTML and unsafe URLs while preserving Prism language classes", () => {
  const markdown = "```js\nconst x = 1;\n```\n<script>alert(1)</script>\n[x](javascript:alert(1))";
  const result = renderMarkdown(markdown);
  assert.match(result.bodyHtml, /class="language-js"/);
  assert.doesNotMatch(result.bodyHtml, /<script>/);
  assert.match(result.bodyHtml, /&lt;script&gt;/);
  assert.match(result.bodyHtml, /href="#"/);
});

test("search parser and SQL preserve the documented filter semantics", () => {
  const filters = parseSearch({ q: "기록", series: ["3", "8"], category: ["2", "4"], tag: ["Cloudflare,D1", "D1", "js lang"], from: "2026-01-01", to: "2027-01-01", page: "13" });
  assert.deepEqual(filters.series, [3, 8]);
  assert.deepEqual(filters.categories, [2, 4]);
  assert.deepEqual(filters.tags, ["Cloudflare", "D1", "js lang"]);
  const query = searchQuery(filters);
  assert.match(query.where, /series_id IN \(\?,\?\)/);
  assert.match(query.where, /HAVING COUNT\(DISTINCT pc.category_id\) = \?/);
  assert.equal((query.where.match(/json_each/g) || []).length, 3);
  assert.match(query.where, /body_markdown LIKE/);
  assert.equal(searchParams(filters, 13).getAll("tag").length, 3);
});

test("three-character text uses escaped FTS phrase and LIKE metacharacters stay literal", () => {
  assert.match(searchQuery(parseSearch({ q: "worker" })).where, /post_fts MATCH/);
  assert.equal(ftsPhrase('a"b'), '"a""b"');
  assert.equal(escapeLike("50%_done\\"), "50\\%\\_done\\\\");
  assert.equal(dateEpoch("2026-01-01"), 1767193200);
});

test("ten-page blocks and input normalization are deterministic", () => {
  assert.equal(pageBlock(13, 500).previous, 10);
  assert.equal(pageBlock(13, 500).next, 21);
  assert.deepEqual(positiveIds(["2", "2", "x", "-1"]), [2]);
  assert.deepEqual(uniqueText(["a,b", "b", " c "]), ["a", "b", "c"]);
});

test("sessions use secure cookies and PBKDF2 verification", async () => {
  assert.match(sessionCookie("raw"), /HttpOnly; Secure; SameSite=Strict/);
  assert.doesNotMatch(csrfCookie("token"), /HttpOnly/);
  const stored = await passwordHash("correct-horse-battery");
  assert.equal(await verifyPassword("correct-horse-battery", { password_hash: stored.hash, password_salt: stored.salt, password_iterations: stored.iterations }), true);
  assert.equal(await verifyPassword("wrong", { password_hash: stored.hash, password_salt: stored.salt, password_iterations: stored.iterations }), false);
});

test("image paths and WebP magic are validated", () => {
  const post = "11111111-1111-4111-8111-111111111111";
  const image = "22222222-2222-4222-8222-222222222222";
  assert.equal(imageKey(post, image), `posts/${post}/${image}.webp`);
  const buffer = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);
  assert.equal(validateImages(post, [{ originalname: `${image}.webp`, mimetype: "image/webp", buffer }], []).uploads.length, 1);
  assert.throws(() => validateImages(post, [{ originalname: `${image}.svg`, mimetype: "image/svg+xml", buffer: Buffer.from("<svg") }], []), /WebP/);
});

test("schema contains contentless trigram FTS and excludes removed models", async () => {
  const schema = await readFile("migrations/0001_initial.sql", "utf8");
  assert.match(schema, /contentless_delete=1/);
  assert.match(schema, /tokenize='trigram'/);
  assert.doesNotMatch(schema, /\brole\b|post_images|CREATE TABLE tags|CREATE TABLE pages/);
});
