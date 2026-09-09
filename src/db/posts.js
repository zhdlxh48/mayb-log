import { PAGE_SIZE } from "../lib.js";
import countPublished from "./queries/posts/count-published.sql";
import deleteCategories from "./queries/posts/delete-categories.sql";
import deleteFts from "./queries/posts/delete-fts.sql";
import deleteQuery from "./queries/posts/delete.sql";
import findEditable from "./queries/posts/find-editable-by-id.sql";
import findIdAndUuid from "./queries/posts/find-id-and-uuid.sql";
import findPublished from "./queries/posts/find-published-by-id.sql";
import insertCategory from "./queries/posts/insert-category.sql";
import insertFts from "./queries/posts/insert-fts.sql";
import insertQuery from "./queries/posts/insert.sql";
import listPublished from "./queries/posts/list-published.sql";
import optionsCategories from "./queries/posts/options-categories.sql";
import optionsSeries from "./queries/posts/options-series.sql";
import publishedForRss from "./queries/posts/published-for-rss.sql";
import publishedForSitemap from "./queries/posts/published-for-sitemap.sql";
import updateQuery from "./queries/posts/update.sql";

export async function findPublishedPosts(db, page) {
  const [count, rows] = await db.batch([
    db.prepare(countPublished),
    db.prepare(listPublished).bind(PAGE_SIZE, (page - 1) * PAGE_SIZE),
  ]);
  return { total: count.results[0].total, posts: rows.results };
}

export const findPublishedPostById = (db, id) => db.prepare(findPublished).bind(id).first();
export const findPostIdentity = (db, id) => db.prepare(findIdAndUuid).bind(id).first();

export function editorOptions(db) {
  return db.batch([db.prepare(optionsSeries), db.prepare(optionsCategories)]);
}

export function editablePostAndOptions(db, id) {
  return db.batch([
    db.prepare(findEditable).bind(id),
    db.prepare(optionsSeries),
    db.prepare(optionsCategories),
  ]);
}

export async function insertPost(db, post, categoryIds, plainBody) {
  const row = await db
    .prepare(insertQuery)
    .bind(
      post.uuid,
      post.authorUserId,
      post.title,
      post.subtitle,
      post.description,
      post.bodyMarkdown,
      post.bodyHtml,
      post.seriesId,
      post.seriesPosition,
      post.tags,
      post.publishedAt,
      post.now,
      post.now,
      post.draft,
      post.noindex,
    )
    .first();
  try {
    await db.batch([
      db
        .prepare(insertFts)
        .bind(row.id, post.title, post.subtitle || "", post.description, plainBody),
      ...categoryIds.map((categoryId) => db.prepare(insertCategory).bind(row.id, categoryId)),
    ]);
  } catch (error) {
    await db.prepare(deleteQuery).bind(row.id).run();
    throw error;
  }
  return row.id;
}

export async function updatePost(db, id, post, categoryIds, plainBody) {
  await db.batch([
    db
      .prepare(updateQuery)
      .bind(
        post.title,
        post.subtitle,
        post.description,
        post.bodyMarkdown,
        post.bodyHtml,
        post.seriesId,
        post.seriesPosition,
        post.tags,
        post.publishedAt,
        post.now,
        post.draft,
        post.noindex,
        id,
      ),
    db.prepare(deleteCategories).bind(id),
    ...categoryIds.map((categoryId) => db.prepare(insertCategory).bind(id, categoryId)),
    db.prepare(deleteFts).bind(id),
    db.prepare(insertFts).bind(id, post.title, post.subtitle || "", post.description, plainBody),
  ]);
}

export async function deletePost(db, id) {
  const post = await findPostIdentity(db, id);
  if (!post) return null;
  await db.batch([db.prepare(deleteFts).bind(id), db.prepare(deleteQuery).bind(id)]);
  return post;
}

export async function publishedForFeeds(db, includeNoindex = true) {
  return (await db.prepare(includeNoindex ? publishedForRss : publishedForSitemap).all()).results;
}
