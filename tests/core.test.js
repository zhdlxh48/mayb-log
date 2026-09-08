import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import {
  enforceAuthRate,
  passwordHash,
  PASSWORD_ITERATIONS,
  requireCsrf,
  sessionCookie,
  verifyPassword,
  verifyTurnstile,
} from "../src/auth.js";
import { escapeLike } from "../src/data.js";
import { detectImage } from "../src/routes-admin.js";
import { searchResults } from "../src/routes-public.js";
import { renderMarkdown } from "../src/markdown.js";
import { normalizeText, slugify } from "../src/lib.js";
import { pagination } from "../src/views.js";

test("Markdown is stored in canonical, safe forms with Prism language classes", () => {
  const markdown =
    "# 제목\n\n```ts\nconst x = 1;\n```\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))";
  const result = renderMarkdown(markdown);
  assert.equal(result.bodyMarkdown, markdown);
  assert.match(result.bodyHtml, /class="language-ts"/);
  assert.doesNotMatch(result.bodyHtml, /<script>/);
  assert.match(result.bodyHtml, /&lt;script&gt;/);
  assert.match(result.bodyHtml, /href="#"/);
  assert.match(result.bodyText, /제목/);
});

test("normalization, literal LIKE escaping and Korean slugs are deterministic", () => {
  assert.equal(normalizeText(" ＭarkDown "), "markdown");
  assert.equal(escapeLike("50%_done\\"), "50\\%\\_done\\\\");
  assert.equal(slugify("개발 기록"), "개발-기록");
});

test("fixed ten-page pagination moves by groups", () => {
  const html = pagination("x", "posts", 13, 500);
  assert.match(html, /page=10">&lt;<\/a>/);
  assert.match(html, /page=21">&gt;<\/a>/);
  assert.match(
    html,
    /page=13" aria-current="page"|aria-current="page" href="[^"]*page=13/,
  );
});

test("search All limits sections to ten and filtered results paginate by twenty", () => {
  const posts = Array.from({ length: 21 }, (_, index) => ({
    id: index,
    slug: `p-${index}`,
    title: `Post ${index}`,
    description: "x",
    published_at: 1,
    username: "a",
    display_name: "A",
    categories: [],
    tags: [],
  }));
  const data = {
    posts,
    series: [],
    categories: [],
    tags: [],
    authors: [],
    archive: [],
  };
  const summary = searchResults("post", "all", 1, data);
  assert.equal((summary.match(/class="post-item"/g) || []).length, 10);
  assert.match(summary, /type=posts">More/);
  const filtered = searchResults("post", "posts", 2, data);
  assert.equal((filtered.match(/class="post-item"/g) || []).length, 1);
  assert.match(filtered, /aria-current="page"[^>]*page=2/);
});

test("PBKDF2 hashes and verifies without storing the password", async (t) => {
  const started = performance.now();
  const result = await passwordHash("correct-horse-battery");
  t.diagnostic(
    `PBKDF2-SHA256 ${PASSWORD_ITERATIONS} iterations: ${Math.round(performance.now() - started)} ms`,
  );
  assert.equal(result.iterations, 600_000);
  assert.notEqual(result.hash, "correct-horse-battery");
  assert.equal(
    await verifyPassword("correct-horse-battery", {
      password_hash: result.hash,
      password_salt: result.salt,
      password_iterations: result.iterations,
    }),
    true,
  );
  assert.equal(
    await verifyPassword("wrong-password", {
      password_hash: result.hash,
      password_salt: result.salt,
      password_iterations: result.iterations,
    }),
    false,
  );
});

test("cookie, CSRF, rate limit and Turnstile failures are enforced", async () => {
  assert.equal(
    sessionCookie("raw"),
    "session=raw; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800",
  );
  const session = { csrf_token: "right" };
  const data = new FormData();
  data.set("csrf", "right");
  assert.doesNotThrow(() =>
    requireCsrf(
      new Request("http://localhost/save", {
        headers: { Origin: "http://localhost" },
      }),
      data,
      session,
      { SITE_ORIGIN: "https://example.com" },
    ),
  );
  assert.throws(
    () =>
      requireCsrf(
        new Request("https://example.com/save", {
          headers: { Origin: "https://evil.example" },
        }),
        data,
        session,
        { SITE_ORIGIN: "https://example.com" },
      ),
    /요청을 확인/,
  );
  await assert.rejects(
    () =>
      enforceAuthRate(
        new Request("https://example.com/login"),
        { AUTH_RATE_LIMIT: { limit: async () => ({ success: false }) } },
        "user",
        "login",
      ),
    /요청이 너무 많/,
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: false }), {
      headers: { "content-type": "application/json" },
    });
  await assert.rejects(
    () =>
      verifyTurnstile(
        new Request("https://example.com/login"),
        {
          TURNSTILE_SECRET_KEY: "x",
          TURNSTILE_SITE_KEY: "site",
          SITE_ORIGIN: "https://example.com",
        },
        new FormData(),
        "login",
      ),
    /사람인지 확인/,
  );
  globalThis.fetch = originalFetch;
});

test("image upload magic bytes allow JPEG, PNG and WebP only", () => {
  assert.equal(detectImage(Uint8Array.from([0xff, 0xd8, 0xff])), "image/jpeg");
  assert.equal(
    detectImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])),
    "image/png",
  );
  assert.equal(
    detectImage(new TextEncoder().encode("RIFFxxxxWEBP")),
    "image/webp",
  );
  assert.equal(detectImage(new TextEncoder().encode("<svg>")), null);
});

test("vendored Prism contains every documented language and alias", async () => {
  const prism = await readFile("public/vendor/prism.js", "utf8");
  for (const language of [
    "javascript",
    "js",
    "typescript",
    "ts",
    "markup",
    "html",
    "css",
    "json",
    "bash",
    "shell",
    "sql",
    "csharp",
    "go",
    "markdown",
    "yaml",
  ]) {
    assert.match(prism, new RegExp(`languages\\.${language}\\b`), language);
  }
});
