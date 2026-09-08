import { requireCsrf, requireUser } from "./auth.js";
import { decodeContent } from "./data.js";
import { buildSearchText, renderMarkdown } from "./markdown.js";
import {
  escapeHtml,
  form,
  html,
  HttpError,
  parseList,
  redirect,
  slugify,
} from "./lib.js";
import { field, layout, message } from "./views.js";

export async function adminRoute(context) {
  const { request, env, url, session, nav } = context;
  if (!url.pathname.startsWith("/admin")) return null;
  requireUser(session);

  if (url.pathname === "/admin" && request.method === "GET") {
    const body = `<nav aria-label="관리"><ul><li><a href="/admin/posts">글 관리</a></li><li><a href="/admin/posts/new">새 글</a></li>${session.role === "admin" ? '<li><a href="/admin/users">사용자 관리</a></li>' : ""}</ul></nav>`;
    return adminPage(context, "Admin", body);
  }
  if (url.pathname === "/admin/posts" && request.method === "GET")
    return postsPage(context);
  if (url.pathname === "/admin/posts/new" && request.method === "GET")
    return editorPage(context, null);
  if (url.pathname === "/admin/posts" && request.method === "POST")
    return savePost(context, null);

  let match = url.pathname.match(/^\/admin\/posts\/(\d+)\/edit\/?$/);
  if (match && request.method === "GET") {
    const post = await editablePost(context, Number(match[1]));
    return editorPage(context, post);
  }
  match = url.pathname.match(/^\/admin\/posts\/(\d+)\/?$/);
  if (match && request.method === "POST")
    return savePost(context, Number(match[1]));
  if (url.pathname === "/admin/users" && request.method === "GET")
    return usersPage(context);
  match = url.pathname.match(/^\/admin\/users\/(\d+)\/(status|role)\/?$/);
  if (match && request.method === "POST")
    return updateUser(context, Number(match[1]), match[2]);
  if (url.pathname === "/admin/images" && request.method === "POST")
    return uploadImage(context);
  return null;
}

function adminPage(
  { env, nav, session },
  title,
  body,
  status = 200,
  scripts = "",
) {
  return html(
    layout(env, nav, session, {
      title,
      description: title,
      canonical: "/admin",
      noindex: true,
      body,
      scripts,
      htmx: true,
    }),
    status,
  );
}

async function postsPage(context) {
  const { env, session } = context;
  const condition =
    session.role === "admin"
      ? "WHERE c.kind='post'"
      : "WHERE c.kind='post' AND c.author_user_id=?";
  const statement = env.DB.prepare(
    `SELECT c.id,c.title,c.slug,c.draft,c.updated_at,u.display_name FROM content c JOIN users u ON u.id=c.author_user_id ${condition} ORDER BY c.updated_at DESC`,
  );
  const result = await (
    session.role === "admin" ? statement : statement.bind(session.id)
  ).all();
  const rows = result.results
    .map(
      (post) =>
        `<tr><td><a href="/admin/posts/${post.id}/edit">${escapeHtml(post.title)}</a></td><td>${post.draft ? "초안" : "공개"}</td><td>${escapeHtml(post.display_name)}</td></tr>`,
    )
    .join("");
  return adminPage(
    context,
    "글 관리",
    `<p><a href="/admin/posts/new">새 글 쓰기</a></p><div class="table-scroll"><table><thead><tr><th>제목</th><th>상태</th><th>작성자</th></tr></thead><tbody>${rows || '<tr><td colspan="3">글이 없습니다.</td></tr>'}</tbody></table></div>`,
  );
}

async function editablePost({ env, session }, id) {
  const row = await env.DB.prepare("SELECT * FROM content WHERE id=?")
    .bind(id)
    .first();
  if (!row || row.kind !== "post")
    throw new HttpError(404, "글을 찾을 수 없습니다.");
  if (session.role !== "admin" && row.author_user_id !== session.id)
    throw new HttpError(403, "다른 작성자의 글은 수정할 수 없습니다.");
  return decodeContent(row);
}

function editorPage(context, post, error = "", status = 200) {
  const { session } = context;
  const action = post?.id ? `/admin/posts/${post.id}` : "/admin/posts";
  const dateValue = post?.published_at
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        dateStyle: "short",
        timeStyle: "short",
      })
        .format(new Date(post.published_at * 1000))
        .replace(" ", "T")
    : "";
  const body = `${message(error)}<form class="admin-editor" action="${action}" method="post"${error ? ' aria-describedby="form-error"' : ""}><input type="hidden" name="csrf" value="${escapeHtml(session.csrf_token)}">${field("title", "제목", post?.title, { required: true, maxlength: 160 })}${field("slug", "주소 이름", post?.slug, { required: true, maxlength: 120 })}${field("subtitle", "부제", post?.subtitle, { maxlength: 200 })}${field("description", "설명", post?.description, { required: true, maxlength: 300 })}${field("categories", "카테고리 (쉼표 구분)", post?.categories?.join(", "))}${field("tags", "태그 (쉼표 구분)", post?.tags?.join(", "))}${field("series_id", "시리즈 주소 이름", post?.series_id || "")}${field("series_order", "시리즈 순서", post?.series_order || "", { type: "number" })}${field("published_at", "발행일 (서울 시간)", dateValue, { type: "datetime-local" })}${field("image_key", "대표 이미지 R2 key", post?.image_key || "")}${field("image_alt", "대표 이미지 설명", post?.image_alt || "")}${field("noindex", "검색 엔진 색인 제외", post?.noindex, { type: "checkbox" })}${field("draft", "초안으로 저장", post ? post.draft : true, { type: "checkbox" })}${field("body_markdown", "Markdown 본문", post?.body_markdown, { type: "textarea", required: true })}<div class="editor-actions"><button type="submit">저장</button><button type="button" id="preview-button">미리보기</button></div></form><section><h2>미리보기</h2><div id="markdown-preview" class="article-body" aria-live="polite"></div></section><section><h2>이미지 업로드</h2><form id="image-form" enctype="multipart/form-data"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf_token)}"><label for="image-file">JPEG, PNG 또는 WebP</label><input id="image-file" name="image" type="file" accept="image/jpeg,image/png,image/webp"><button type="submit">압축 후 업로드</button></form><p id="image-status" role="status"></p><textarea id="image-snippet" readonly aria-label="업로드한 이미지 Markdown"></textarea></section>`;
  const scripts =
    '<script src="/vendor/marked.js"></script><script src="/vendor/browser-image-compression.js"></script><script src="/admin/editor.js"></script><script src="/admin/image.js"></script>';
  return adminPage(context, post ? "글 수정" : "새 글", body, status, scripts);
}

async function savePost(context, id) {
  const { request, env, session } = context;
  const existing = id ? await editablePost(context, id) : null;
  const data = await form(request);
  requireCsrf(request, data, session, env);
  const values = {
    title: String(data.get("title") || "").trim(),
    slug: slugify(data.get("slug")),
    subtitle: String(data.get("subtitle") || "").trim(),
    description: String(data.get("description") || "").trim(),
    categories: parseList(data.get("categories")),
    tags: parseList(data.get("tags")),
    series_id: String(data.get("series_id") || "").trim() || null,
    series_order: data.get("series_order")
      ? Number(data.get("series_order"))
      : null,
    image_key: String(data.get("image_key") || "").trim() || null,
    image_alt: String(data.get("image_alt") || "").trim() || null,
    noindex: data.get("noindex") === "1",
    draft: data.get("draft") === "1",
    body_markdown: String(data.get("body_markdown") || ""),
  };
  const parsedDate = data.get("published_at")
    ? Date.parse(`${data.get("published_at")}:00+09:00`)
    : NaN;
  values.published_at = Number.isFinite(parsedDate)
    ? Math.floor(parsedDate / 1000)
    : null;
  let error = "";
  if (
    !values.title ||
    !values.slug ||
    !values.description ||
    !values.body_markdown
  )
    error = "제목, 주소 이름, 설명, 본문은 필수입니다.";
  else if (
    !/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u.test(values.slug)
  )
    error = "주소 이름은 글자와 숫자를 하이픈으로 연결해 주세요.";
  else if (!values.draft && !values.published_at)
    error = "공개 글에는 발행일이 필요합니다.";
  else if (
    values.series_id &&
    (!Number.isInteger(values.series_order) || values.series_order < 1)
  )
    error = "시리즈 글에는 1 이상의 정수 순서가 필요합니다.";
  else if (!values.series_id && values.series_order)
    error = "시리즈를 먼저 입력해 주세요.";
  else if (values.image_key && !values.image_alt)
    error = "대표 이미지 설명을 입력해 주세요.";
  if (
    values.series_id &&
    !(await env.DB.prepare("SELECT 1 FROM series WHERE slug=?")
      .bind(values.series_id)
      .first())
  )
    error = "존재하지 않는 시리즈입니다.";
  if (error)
    return editorPage(context, { ...existing, ...values, id }, error, 400);
  const rendered = renderMarkdown(values.body_markdown);
  const series = values.series_id
    ? await env.DB.prepare("SELECT title FROM series WHERE slug=?")
        .bind(values.series_id)
        .first()
    : null;
  const authorId = existing?.author_user_id || session.id;
  const author =
    authorId === session.id
      ? session
      : await env.DB.prepare("SELECT display_name FROM users WHERE id=?")
          .bind(authorId)
          .first();
  const searchText = buildSearchText({
    ...values,
    bodyText: rendered.bodyText,
    displayName: author.display_name,
    seriesTitle: series?.title,
  });
  const now = Math.floor(Date.now() / 1000);
  try {
    if (existing) {
      await env.DB.prepare(
        `UPDATE content SET slug=?,title=?,subtitle=?,description=?,body_markdown=?,body_html=?,body_text=?,search_text=?,categories=?,tags=?,series_id=?,series_order=?,image_key=?,image_alt=?,published_at=?,updated_at=?,draft=?,noindex=? WHERE id=?`,
      )
        .bind(
          values.slug,
          values.title,
          values.subtitle || null,
          values.description,
          rendered.bodyMarkdown,
          rendered.bodyHtml,
          rendered.bodyText,
          searchText,
          JSON.stringify(values.categories),
          JSON.stringify(values.tags),
          values.series_id,
          values.series_order,
          values.image_key,
          values.image_alt,
          values.published_at,
          now,
          Number(values.draft),
          Number(values.noindex),
          id,
        )
        .run();
    } else {
      await env.DB.prepare(
        `INSERT INTO content (kind,slug,title,subtitle,description,body_markdown,body_html,body_text,search_text,author_user_id,categories,tags,series_id,series_order,image_key,image_alt,published_at,updated_at,draft,noindex) VALUES ('post',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
        .bind(
          values.slug,
          values.title,
          values.subtitle || null,
          values.description,
          rendered.bodyMarkdown,
          rendered.bodyHtml,
          rendered.bodyText,
          searchText,
          session.id,
          JSON.stringify(values.categories),
          JSON.stringify(values.tags),
          values.series_id,
          values.series_order,
          values.image_key,
          values.image_alt,
          values.published_at,
          now,
          Number(values.draft),
          Number(values.noindex),
        )
        .run();
    }
  } catch (caught) {
    if (String(caught).includes("UNIQUE"))
      return editorPage(
        context,
        { ...existing, ...values, id },
        "주소 이름이나 시리즈 순서가 이미 사용 중입니다.",
        409,
      );
    throw caught;
  }
  return redirect("/admin/posts");
}

async function usersPage(context) {
  requireUser(context.session, "admin");
  const users = await context.env.DB.prepare(
    "SELECT id,username,display_name,role,status,created_at FROM users ORDER BY created_at DESC",
  ).all();
  const rows = users.results
    .map(
      (user) =>
        `<tr><td>${escapeHtml(user.username)}</td><td>${escapeHtml(user.display_name)}</td><td><form method="post" action="/admin/users/${user.id}/status"><input type="hidden" name="csrf" value="${escapeHtml(context.session.csrf_token)}"><select name="value" aria-label="${escapeHtml(user.username)} 상태">${["pending", "active", "inactive"].map((value) => `<option${user.status === value ? " selected" : ""}>${value}</option>`).join("")}</select><button>변경</button></form></td><td><form method="post" action="/admin/users/${user.id}/role"><input type="hidden" name="csrf" value="${escapeHtml(context.session.csrf_token)}"><select name="value" aria-label="${escapeHtml(user.username)} 역할">${["author", "admin"].map((value) => `<option${user.role === value ? " selected" : ""}>${value}</option>`).join("")}</select><button>변경</button></form></td></tr>`,
    )
    .join("");
  return adminPage(
    context,
    "사용자 관리",
    `<div class="table-scroll"><table><thead><tr><th>아이디</th><th>이름</th><th>상태</th><th>역할</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  );
}

async function updateUser(context, userId, property) {
  const { request, env, session } = context;
  requireUser(session, "admin");
  const data = await form(request);
  requireCsrf(request, data, session, env);
  const value = String(data.get("value") || "");
  const allowed =
    property === "status"
      ? ["pending", "active", "inactive"]
      : ["author", "admin"];
  if (!allowed.includes(value))
    throw new HttpError(400, "잘못된 계정 값입니다.");
  const user = await env.DB.prepare("SELECT * FROM users WHERE id=?")
    .bind(userId)
    .first();
  if (!user) throw new HttpError(404, "사용자를 찾을 수 없습니다.");
  const removesActiveAdmin =
    user.role === "admin" &&
    user.status === "active" &&
    ((property === "status" && value !== "active") ||
      (property === "role" && value !== "admin"));
  const result = await env.DB.prepare(
    `UPDATE users SET ${property}=?,updated_at=? WHERE id=? AND NOT (?=1 AND (SELECT count(*) FROM users WHERE role='admin' AND status='active')<=1)`,
  )
    .bind(
      value,
      Math.floor(Date.now() / 1000),
      userId,
      Number(removesActiveAdmin),
    )
    .run();
  if (!result.meta.changes && removesActiveAdmin)
    throw new HttpError(
      409,
      "마지막 활성 관리자는 비활성화하거나 권한을 낮출 수 없습니다.",
    );
  if (property === "status" && value !== "active")
    await env.DB.prepare("DELETE FROM sessions WHERE user_id=?")
      .bind(userId)
      .run();
  return redirect("/admin/users");
}

async function uploadImage(context) {
  const { request, env, session } = context;
  const data = await form(request);
  requireCsrf(request, data, session, env);
  const image = data.get("image");
  if (!(image instanceof File) || !image.size || image.size > 5_000_000)
    throw new HttpError(400, "5MB 이하 이미지를 선택해 주세요.");
  const bytes = new Uint8Array(await image.arrayBuffer());
  const detected = detectImage(bytes);
  if (!detected || detected !== image.type)
    throw new HttpError(400, "JPEG, PNG, WebP 파일만 업로드할 수 있습니다.");
  const year = new Date().getUTCFullYear();
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[detected];
  const key = `media/${session.id}/${year}/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key, bytes, {
    httpMetadata: {
      contentType: detected,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  return html(
    `<p>업로드 완료</p><code>![이미지 설명](/media/${key})</code>`,
    201,
  );
}

export function detectImage(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
