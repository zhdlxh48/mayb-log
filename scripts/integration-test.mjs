import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const port = 8791;
const origin = `http://127.0.0.1:${port}`;
const wrangler = "node_modules/wrangler/bin/wrangler.js";
await writeFile(".dev.vars", 'TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"\nTURNSTILE_SITE_KEY="1x00000000000000000000AA"\n');

const command = (...args) => {
  const result = spawnSync(process.execPath, [wrangler, ...args], { encoding: "utf8" });
  if (result.status) throw new Error(result.stderr || result.stdout);
  return result.stdout;
};
const sql = (statement) => JSON.parse(command("d1", "execute", "mayb-log-final", "--local", "--json", "--command", statement))[0].results;
const encodedPost = (path, values, cookie = "") => fetch(`${origin}${path}`, {
  method: "POST", redirect: "manual",
  headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(values),
});
const login = async (username = "testuser", password = "test-password-1234") => {
  const response = await encodedPost("/login", { username, password, "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX" });
  assert.equal(response.status, 303);
  const setCookies = response.headers.getSetCookie();
  const session = setCookies.find((value) => value.startsWith("session="));
  const csrf = setCookies.find((value) => value.startsWith("csrf="));
  assert.match(session, /HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=604800/);
  assert.match(csrf, /Secure; SameSite=Strict; Path=\/; Max-Age=604800/);
  assert.doesNotMatch(csrf, /HttpOnly/);
  return { cookie: `${session.split(";")[0]}; ${csrf.split(";")[0]}`, csrf: csrf.match(/^csrf=([^;]+)/)[1] };
};

sql("DELETE FROM sessions; DELETE FROM posts WHERE id > 2; DELETE FROM users WHERE username='seconduser'; DELETE FROM series WHERE title='Integration Series'; DELETE FROM categories WHERE name='Integration Category'; UPDATE users SET display_name='MayB' WHERE username='testuser'");
const worker = spawn(process.execPath, [wrangler, "dev", "--local", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let output = "";
worker.stdout.on("data", (chunk) => { output += chunk; });
worker.stderr.on("data", (chunk) => { output += chunk; });

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (attempt === 59) throw new Error(`Worker did not start:\n${output}`);
  }

  for (const path of ["/", "/posts", "/posts/1", "/series", "/categories", "/archive", "/search", "/login", "/signup", "/rss.xml", "/sitemap.xml", "/robots.txt", "/media/posts/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp"])
    assert.equal((await fetch(origin + path)).status, 200, path);
  for (const path of ["/admin", "/profile/posts", "/profile/series", "/profile/categories", "/profile/users", "/tags", "/authors", "/series/1", "/categories/1"])
    assert.equal((await fetch(origin + path)).status, 404, path);

  const publicHtml = await (await fetch(`${origin}/posts`, { headers: { Cookie: "session=fake" } })).text();
  assert.match(publicHtml, />Profile<\/a>/);
  assert.doesNotMatch(publicHtml, />Tags<|>Sign up<|popover|dropdown/);
  assert.match(await (await fetch(`${origin}/posts/1`)).text(), /data-delete-post="1"/);

  assert.match(await (await fetch(`${origin}/search?q=Worker`)).text(), /Express와 EJS/);
  assert.match(await (await fetch(`${origin}/search?q=기록`)).text(), /서울 시간/);
  assert.match(await (await fetch(`${origin}/search?series=1&category=1&tag=Cloudflare&tag=D1,js%20lang`)).text(), /Express와 EJS/);
  assert.doesNotMatch(await (await fetch(`${origin}/search?category=1&category=2`)).text(), /class="post-row"/);
  assert.doesNotMatch(await (await fetch(`${origin}/search?q=%25`)).text(), /class="post-row"/);
  const fragment = await (await fetch(`${origin}/search?q=Worker`, { headers: { "HX-Request": "true" } })).text();
  assert.doesNotMatch(fragment, /<!doctype html>/);
  assert.match(fragment, /Express와 EJS/);
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert.match(sitemap, /posts\/1/);
  assert.doesNotMatch(sitemap, /posts\/2/);
  assert.match(await (await fetch(`${origin}/rss.xml`)).text(), /서울 시간/);

  assert.equal((await fetch(`${origin}/login`, { method: "POST", redirect: "manual", headers: { Origin: "https://evil.example", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ username: "testuser", password: "test-password-1234", "cf-turnstile-response": "x" }) })).status, 403);
  const auth = await login();
  assert.equal((await fetch(`${origin}/profile`, { headers: { Cookie: auth.cookie } })).status, 200);
  assert.equal((await encodedPost("/series/create", { csrf: "wrong", title: "Bad" }, auth.cookie)).status, 403);
  assert.equal((await encodedPost("/series/create", { csrf: auth.csrf, title: "Integration Series" }, auth.cookie)).status, 303);
  assert.equal((await encodedPost("/categories/create", { csrf: auth.csrf, name: "Integration Category" }, auth.cookie)).status, 303);
  const seriesId = sql("SELECT id FROM series WHERE title='Integration Series'")[0].id;
  const categoryId = sql("SELECT id FROM categories WHERE name='Integration Category'")[0].id;

  const postUuid = crypto.randomUUID();
  const imageUuid = crypto.randomUUID();
  const form = new FormData();
  for (const [key, value] of Object.entries({ csrf: auth.csrf, post_uuid: postUuid, title: "통합 테스트 글", description: "Express multipart 검증", body_markdown: `본문 검색어 worker\n\n![이미지](/media/posts/${postUuid}/${imageUuid}.webp)`, tags: "Cloudflare, D1", series_id: String(seriesId), category: String(categoryId) })) form.append(key, value);
  form.append("images", new Blob([await readFile("seed/sample.webp")], { type: "image/webp" }), `${imageUuid}.webp`);
  let response = await fetch(`${origin}/posts`, { method: "POST", redirect: "manual", headers: { Origin: origin, Cookie: auth.cookie }, body: form });
  assert.equal(response.status, 303, await response.text());
  const created = sql(`SELECT id, author_user_id FROM posts WHERE uuid='${postUuid}'`)[0];
  assert.equal((await fetch(`${origin}/media/posts/${postUuid}/${imageUuid}.webp`)).status, 200);

  sql("INSERT INTO users (username,display_name,password_hash,password_salt,password_iterations,status,created_at,updated_at) SELECT 'seconduser','Second',password_hash,password_salt,password_iterations,'active',created_at,updated_at FROM users WHERE username='testuser'");
  const second = await login("seconduser");
  const update = new FormData();
  for (const [key, value] of Object.entries({ csrf: second.csrf, post_uuid: postUuid, title: "다른 사용자가 수정한 글", description: "권한 구분 없음", body_markdown: "수정된 worker 본문", tags: "D1" })) update.append(key, value);
  response = await fetch(`${origin}/posts/${created.id}/update`, { method: "POST", redirect: "manual", headers: { Origin: origin, Cookie: second.cookie }, body: update });
  assert.equal(response.status, 303, await response.text());
  assert.equal(sql(`SELECT author_user_id FROM posts WHERE id=${created.id}`)[0].author_user_id, created.author_user_id);

  const failedUuid = crypto.randomUUID();
  const failedImage = crypto.randomUUID();
  const failed = new FormData();
  for (const [key, value] of Object.entries({ csrf: auth.csrf, post_uuid: failedUuid, title: "실패 글", description: "rollback", body_markdown: "body", category: "999999" })) failed.append(key, value);
  failed.append("images", new Blob([await readFile("seed/sample.webp")], { type: "image/webp" }), `${failedImage}.webp`);
  response = await fetch(`${origin}/posts`, { method: "POST", redirect: "manual", headers: { Origin: origin, Cookie: auth.cookie }, body: failed });
  assert.equal(response.status, 400);
  assert.equal((await fetch(`${origin}/media/posts/${failedUuid}/${failedImage}.webp`)).status, 404);

  assert.equal((await encodedPost(`/posts/${created.id}/delete`, { csrf: second.csrf }, second.cookie)).status, 303);
  assert.equal((await fetch(`${origin}/posts/${created.id}`)).status, 404);
  assert.equal((await encodedPost("/profile/update", { csrf: auth.csrf, display_name: "MayB Updated" }, auth.cookie)).status, 303);
  assert.equal((await encodedPost("/logout", { csrf: auth.csrf }, auth.cookie)).status, 303);

  console.log("Integration checks passed: Express/EJS routes, auth/CSRF, SQL search, multipart R2 upload, cross-author edit, rollback, and feeds.");
} finally {
  worker.kill();
}
