import { Router } from "express";
import { HttpError, integer, json, pageBlock, positiveIds, safeJson, uniqueText } from "../lib.js";
import { findOrCreateCategories } from "../db/categories.js";
import { findOrCreateSeries } from "../db/series.js";
import { deletePost, editablePostAndOptions, editorOptions, findEditablePostById, findPublishedPostById, findPublishedPosts, insertPost, updatePost } from "../db/posts.js";
import { requireActive } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";
import { loadSession } from "../middleware/session.js";
import { deletePrefix, listImages, putImages, upload, validateImages, validUuid } from "../services/images.js";
import { renderMarkdown } from "../services/markdown.js";

export const postRoutes = Router();

const dateInput = (epoch) => epoch ? new Date(epoch * 1000 + 9 * 3600_000).toISOString().slice(0, 16) : "";
const emptyPost = () => ({ id: null, uuid: crypto.randomUUID(), title: "", subtitle: "", description: "", body_markdown: "", series_id: null, series_position: null, tags: [], categoryIds: [], publishedAtInput: "", draft: true, noindex: false });

function formPost(body, authorUserId, fixedUuid) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const bodyMarkdown = String(body.body_markdown || "");
  const uuid = String(body.post_uuid || "");
  if (!title || !description || !bodyMarkdown) throw new HttpError(400, "제목, 설명, 본문을 모두 입력해 주세요.");
  if (title.length > 200 || String(body.subtitle || "").length > 240 || description.length > 2000 || bodyMarkdown.length > 500_000)
    throw new HttpError(400, "게시글 입력 길이를 확인해 주세요.");
  if (/!\[\s*\]\(/.test(bodyMarkdown)) throw new HttpError(400, "이미지 대체 텍스트를 입력해 주세요.");
  if (!validUuid(uuid) || (fixedUuid && uuid !== fixedUuid)) throw new HttpError(400, "게시글 식별자가 올바르지 않습니다.");
  const draft = body.draft === "1" ? 1 : 0;
  let publishedAt = null;
  if (body.published_at) {
    const value = Date.parse(`${body.published_at}:00+09:00`);
    if (!Number.isFinite(value)) throw new HttpError(400, "발행 날짜가 올바르지 않습니다.");
    publishedAt = Math.floor(value / 1000);
  } else if (!draft) publishedAt = Math.floor(Date.now() / 1000);
  const seriesId = body.series_id ? integer(body.series_id, 0) : null;
  const newSeries = String(body.new_series || "").trim();
  if (seriesId && newSeries) throw new HttpError(400, "기존 시리즈와 새 시리즈를 동시에 선택할 수 없습니다.");
  const { bodyHtml, plainBody } = renderMarkdown(bodyMarkdown);
  const tags = uniqueText(body.tags);
  const newCategories = uniqueText(body.new_categories);
  if (tags.length > 50 || tags.some((tag) => tag.length > 80) || newCategories.length > 30 || newCategories.some((name) => name.length > 120))
    throw new HttpError(400, "태그 또는 새 카테고리 입력을 줄여 주세요.");
  return {
    post: {
      uuid, authorUserId, title, subtitle: String(body.subtitle || "").trim() || null,
      description, bodyMarkdown, bodyHtml, seriesId, newSeries,
      seriesPosition: seriesId || newSeries ? integer(body.series_position) : null,
      tags: JSON.stringify(tags), publishedAt,
      draft, noindex: body.noindex === "1" ? 1 : 0, now: Math.floor(Date.now() / 1000),
    },
    categoryIds: positiveIds(body.category),
    newCategories,
    plainBody,
  };
}

async function savePost(req, id = null) {
  const bindings = req.app.locals.bindings();
  const existing = id ? await findEditablePostById(bindings.DB, id) : null;
  if (id && !existing) throw new HttpError(404, "게시글을 찾을 수 없습니다.");
  const input = formPost(req.body, req.user.id, existing?.uuid);
  const images = validateImages(input.post.uuid, req.files, req.body.delete_image);
  const uploaded = await putImages(bindings.MEDIA, images.uploads);
  try {
    input.post.seriesId = await findOrCreateSeries(bindings.DB, input.post.seriesId, input.post.newSeries);
    if (!input.post.seriesId) input.post.seriesPosition = null;
    const categoryIds = await findOrCreateCategories(bindings.DB, input.categoryIds, input.newCategories);
    if (id) await updatePost(bindings.DB, id, input.post, categoryIds, input.plainBody);
    else id = await insertPost(bindings.DB, input.post, categoryIds, input.plainBody);
  } catch (error) {
    await Promise.allSettled(uploaded.map((key) => bindings.MEDIA.delete(key)));
    throw error;
  }
  await Promise.allSettled(images.deletes.map((key) => bindings.MEDIA.delete(key)));
  return id;
}

postRoutes.get("/posts", async (req, res) => {
  const page = integer(req.query.page);
  const result = await findPublishedPosts(req.app.locals.bindings().DB, page);
  const pager = pageBlock(page, result.total);
  res.renderPage("posts", { title: "Posts", ...result, pager, pageUrl: (number) => number > 1 ? `/posts?page=${number}` : "/posts" });
});

postRoutes.get("/posts/new", loadSession, requireActive, async (req, res) => {
  const [series, categories] = await editorOptions(req.app.locals.bindings().DB);
  res.renderPage("post-edit", { title: "New Post", post: emptyPost(), user: req.user, series: series.results, categories: categories.results, images: [], noindex: true, scripts: ["/vendor/marked.js", "/vendor/prism.js", "/vendor/browser-image-compression.js", "/editor.js", "/image-editor.js"], styles: ["/vendor/prism.css"] });
});

postRoutes.get("/posts/:id/edit", loadSession, requireActive, async (req, res) => {
  const id = integer(req.params.id, 0);
  const options = await editablePostAndOptions(req.app.locals.bindings().DB, id);
  const post = options[0].results[0];
  if (!post) throw new HttpError(404, "게시글을 찾을 수 없습니다.");
  post.tags = json(post.tags);
  post.categoryIds = json(post.category_ids);
  post.publishedAtInput = dateInput(post.published_at);
  const images = await listImages(req.app.locals.bindings().MEDIA, post.uuid);
  res.renderPage("post-edit", { title: "Edit Post", post, user: req.user, series: options[1].results, categories: options[2].results, images, noindex: true, scripts: ["/vendor/marked.js", "/vendor/prism.js", "/vendor/browser-image-compression.js", "/editor.js", "/image-editor.js"], styles: ["/vendor/prism.css"] });
});

postRoutes.post("/posts", loadSession, requireActive, upload, requireCsrf, async (req, res) => res.redirect(303, `/posts/${await savePost(req)}`));
postRoutes.post("/posts/:id/update", loadSession, requireActive, upload, requireCsrf, async (req, res) => {
  const id = integer(req.params.id, 0);
  await savePost(req, id);
  res.redirect(303, `/posts/${id}`);
});
postRoutes.post("/posts/:id/delete", loadSession, requireActive, requireCsrf, async (req, res) => {
  const post = await deletePost(req.app.locals.bindings().DB, integer(req.params.id, 0));
  if (post) try { await deletePrefix(req.app.locals.bindings().MEDIA, post.uuid); } catch (error) { console.error(error); }
  res.redirect(303, "/posts");
});

postRoutes.get("/posts/:id", async (req, res) => {
  const post = await findPublishedPostById(req.app.locals.bindings().DB, integer(req.params.id, 0));
  if (!post) throw new HttpError(404, "게시글을 찾을 수 없습니다.");
  const canonical = `${req.app.locals.site.origin}/posts/${post.id}`;
  const jsonLd = safeJson({ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, datePublished: new Date(post.published_at * 1000).toISOString(), author: { "@type": "Person", name: post.author_name }, url: canonical });
  res.renderPage("post", { title: post.title, description: post.description, post, canonical, jsonLd, noindex: Boolean(post.noindex), scripts: ["/post-delete.js", "/vendor/prism.js"], styles: ["/vendor/prism.css"] });
});
