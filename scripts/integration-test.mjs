import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const port = 8791;
const origin = `http://127.0.0.1:${port}`;
const wrangler = "node_modules/wrangler/bin/wrangler.js";
await writeFile(
  ".dev.vars",
  'TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"\nTURNSTILE_SITE_KEY="1x00000000000000000000AA"\n',
);

const command = (...args) => {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    encoding: "utf8",
  });
  if (result.status) throw new Error(result.stderr || result.stdout);
  return result.stdout;
};
const sql = (statement) =>
  JSON.parse(
    command(
      "d1",
      "execute",
      "mayb-log",
      "--local",
      "--json",
      "--command",
      statement,
    ),
  )[0].results;
const formBody = (values) =>
  new URLSearchParams({
    ...values,
    "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  });
const post = (path, values, cookie = "") =>
  fetch(`${origin}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody(values),
  });

sql("DELETE FROM sessions");
sql("UPDATE users SET role='author',status='inactive' WHERE username!='owner'");
const worker = spawn(
  process.execPath,
  [wrangler, "dev", "--local", "--port", String(port)],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let workerOutput = "";
worker.stdout.on("data", (chunk) => {
  workerOutput += chunk;
});
worker.stderr.on("data", (chunk) => {
  workerOutput += chunk;
});

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (attempt === 59)
      throw new Error(`Worker did not start:\n${workerOutput}`);
  }

  const home = await fetch(origin);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<nav class="site-nav"/);
  const postPage = await fetch(`${origin}/posts/first-note`);
  const postHtml = await postPage.text();
  assert.equal(postPage.status, 200);
  assert.match(postHtml, /class="language-ts"/);
  assert.match(postHtml, /BlogPosting/);
  assert.doesNotMatch(postHtml, /Sidebar|post-view/);
  assert.equal(
    (await fetch(`${origin}/media/media/legacy/first-note/thumbnail.jpg`))
      .status,
    200,
  );
  const search = await fetch(`${origin}/search?q=마크`, {
    headers: { "HX-Request": "true" },
  });
  assert.equal(search.status, 200);
  assert.doesNotMatch(await search.text(), /<!doctype html>/);
  const fullSearch = await fetch(`${origin}/search?q=마크`);
  assert.match(await fullSearch.text(), /<!doctype html>/);
  assert.doesNotMatch(
    await (await fetch(`${origin}/search?q=%25&type=posts`)).text(),
    /class="post-item"/,
  );
  assert.match(
    await (await fetch(`${origin}/search?q=noindex&type=posts`)).text(),
    /archive-note/,
  );
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert.doesNotMatch(sitemap, /archive-note/);
  assert.match(await (await fetch(`${origin}/rss.xml`)).text(), /archive-note/);

  const suffix = Date.now().toString(36);
  const adminName = `a${suffix}`.slice(0, 24);
  const authorName = `b${suffix}`.slice(0, 24);
  const password = "correct-horse-battery";
  let response = await post("/signup", {
    username: adminName,
    display_name: "관리자",
    password,
    password_confirmation: password,
  });
  assert.equal(response.status, 201);
  response = await post("/login", { username: adminName, password });
  assert.equal(response.status, 401);
  assert.match(await response.text(), /아이디, 비밀번호 또는 계정 상태/);
  response = await post("/login", {
    username: `missing${suffix}`.slice(0, 31),
    password,
  });
  assert.equal(response.status, 401);
  assert.match(await response.text(), /아이디, 비밀번호 또는 계정 상태/);
  sql(
    `UPDATE users SET status='active',role='admin' WHERE username='${adminName}'`,
  );
  response = await post("/login", { username: adminName, password });
  assert.equal(response.status, 303);
  const adminSetCookie = response.headers.get("set-cookie");
  assert.match(
    adminSetCookie,
    /HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=604800/,
  );
  const adminCookie = adminSetCookie.split(";")[0];
  const raw = adminCookie.slice("session=".length);
  assert.equal(
    sql(`SELECT count(*) count FROM sessions WHERE token_hash='${raw}'`)[0]
      .count,
    0,
  );
  let accountHtml = await (
    await fetch(`${origin}/account`, { headers: { Cookie: adminCookie } })
  ).text();
  const adminCsrf = accountHtml.match(/name="csrf" value="([^"]+)"/)[1];

  response = await post(
    "/admin/posts",
    {
      title: "권한 테스트 글",
      slug: `admin-${suffix}`,
      description: "통합 테스트",
      body_markdown: "# 본문",
      draft: "1",
    },
    adminCookie,
  );
  assert.equal(response.status, 403);
  response = await post(
    "/admin/posts",
    {
      csrf: adminCsrf,
      title: "권한 테스트 글",
      slug: `admin-${suffix}`,
      description: "통합 테스트",
      body_markdown: "# 본문",
      draft: "1",
      author_user_id: "1",
    },
    adminCookie,
  );
  assert.equal(response.status, 303);
  const adminPostId = sql(
    `SELECT id FROM content WHERE slug='admin-${suffix}'`,
  )[0].id;

  sql(
    `INSERT INTO users (username,display_name,password_hash,password_salt,password_iterations,role,status,created_at,updated_at) SELECT '${authorName}','작성자',password_hash,password_salt,password_iterations,'author','active',created_at,updated_at FROM users WHERE username='${adminName}'`,
  );
  response = await post("/login", { username: authorName, password });
  assert.equal(response.status, 303);
  const authorCookie = response.headers.get("set-cookie").split(";")[0];
  accountHtml = await (
    await fetch(`${origin}/account`, { headers: { Cookie: authorCookie } })
  ).text();
  const authorCsrf = accountHtml.match(/name="csrf" value="([^"]+)"/)[1];
  response = await post(
    "/admin/posts",
    {
      csrf: authorCsrf,
      title: "작성자 글",
      slug: `author-${suffix}`,
      description: "소유권 테스트",
      body_markdown: "한국어 본문 검색",
      draft: "1",
      author_user_id: "1",
    },
    authorCookie,
  );
  assert.equal(response.status, 303);
  const author = sql(`SELECT id FROM users WHERE username='${authorName}'`)[0];
  const authorPost = sql(
    `SELECT id,author_user_id FROM content WHERE slug='author-${suffix}'`,
  )[0];
  assert.equal(authorPost.author_user_id, author.id);
  assert.doesNotMatch(
    await (
      await fetch(
        `${origin}/search?q=${encodeURIComponent("한국어 본문 검색")}&type=posts`,
      )
    ).text(),
    new RegExp(`author-${suffix}`),
  );
  assert.equal(
    (
      await fetch(`${origin}/admin/posts/${adminPostId}/edit`, {
        headers: { Cookie: authorCookie },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${origin}/admin/posts/${authorPost.id}/edit`, {
        headers: { Cookie: adminCookie },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await post(
        `/admin/users/${author.id}/status`,
        { csrf: authorCsrf, value: "inactive" },
        authorCookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await post(
        `/admin/users/${sql(`SELECT id FROM users WHERE username='${adminName}'`)[0].id}/role`,
        { csrf: adminCsrf, value: "author" },
        adminCookie,
      )
    ).status,
    409,
  );
  response = await post(
    `/admin/users/${author.id}/status`,
    { csrf: adminCsrf, value: "inactive" },
    adminCookie,
  );
  assert.equal(response.status, 303);
  assert.equal(
    (await fetch(`${origin}/account`, { headers: { Cookie: authorCookie } }))
      .status,
    401,
  );
  response = await post("/login", { username: authorName, password });
  assert.equal(response.status, 401);

  response = await post("/logout", { csrf: adminCsrf }, adminCookie);
  assert.equal(response.status, 303);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(
    (await fetch(`${origin}/account`, { headers: { Cookie: adminCookie } }))
      .status,
    401,
  );
  response = await post("/login", { username: adminName, password });
  const expiringCookie = response.headers.get("set-cookie").split(";")[0];
  sql(
    `UPDATE sessions SET expires_at=0 WHERE user_id=(SELECT id FROM users WHERE username='${adminName}')`,
  );
  assert.equal(
    (await fetch(`${origin}/account`, { headers: { Cookie: expiringCookie } }))
      .status,
    401,
  );
  console.log(
    "Integration checks passed: public routes, search fallback, auth, sessions, CSRF, ownership, status, and last-admin protection.",
  );
} finally {
  worker.kill();
}
