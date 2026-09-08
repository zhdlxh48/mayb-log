import { PAGE_SIZE } from "../lib.js";

const SUMMARY = `
  p.id, p.uuid, p.title, p.subtitle, p.description, p.tags, p.published_at,
  u.display_name AS author_name,
  s.id AS series_id, s.title AS series_title,
  COALESCE((
    SELECT json_group_array(json_object('id', c.id, 'name', c.name))
    FROM post_categories AS pc
    JOIN categories AS c ON c.id = pc.category_id
    WHERE pc.post_id = p.id
  ), '[]') AS categories_json
`;

export async function findPublishedPosts(db, page) {
  const offset = (page - 1) * PAGE_SIZE;
  const [count, rows] = await db.batch([
    db.prepare("SELECT COUNT(id) AS total FROM posts WHERE draft = 0 AND published_at IS NOT NULL"),
    db.prepare(`
      SELECT ${SUMMARY}
      FROM posts AS p
      JOIN users AS u ON u.id = p.author_user_id
      LEFT JOIN series AS s ON s.id = p.series_id
      WHERE p.draft = 0 AND p.published_at IS NOT NULL
      ORDER BY p.published_at DESC, p.id DESC
      LIMIT ? OFFSET ?
    `).bind(PAGE_SIZE, offset),
  ]);
  return { total: count.results[0].total, posts: rows.results };
}

export function findPublishedPostById(db, id) {
  return db.prepare(`
    SELECT ${SUMMARY}, p.body_html, p.noindex, p.series_position
    FROM posts AS p
    JOIN users AS u ON u.id = p.author_user_id
    LEFT JOIN series AS s ON s.id = p.series_id
    WHERE p.id = ? AND p.draft = 0 AND p.published_at IS NOT NULL
  `).bind(id).first();
}

export function findEditablePostById(db, id) {
  return db.prepare(`
    SELECT p.id, p.uuid, p.title, p.subtitle, p.description, p.body_markdown,
           p.series_id, p.series_position, p.tags, p.published_at, p.draft, p.noindex,
           COALESCE((SELECT json_group_array(pc.category_id) FROM post_categories AS pc WHERE pc.post_id = p.id), '[]') AS category_ids
    FROM posts AS p
    WHERE p.id = ?
  `).bind(id).first();
}

export function editorOptions(db) {
  return db.batch([
    db.prepare("SELECT id, title FROM series ORDER BY title COLLATE NOCASE, id"),
    db.prepare("SELECT id, name FROM categories ORDER BY name COLLATE NOCASE, id"),
  ]);
}

export function editablePostAndOptions(db, id) {
  return db.batch([
    db.prepare(`
      SELECT p.id, p.uuid, p.title, p.subtitle, p.description, p.body_markdown,
             p.series_id, p.series_position, p.tags, p.published_at, p.draft, p.noindex,
             COALESCE((SELECT json_group_array(pc.category_id) FROM post_categories AS pc WHERE pc.post_id = p.id), '[]') AS category_ids
      FROM posts AS p WHERE p.id = ?
    `).bind(id),
    db.prepare("SELECT id, title FROM series ORDER BY title COLLATE NOCASE, id"),
    db.prepare("SELECT id, name FROM categories ORDER BY name COLLATE NOCASE, id"),
  ]);
}

export async function insertPost(db, post, categoryIds, plainBody) {
  const row = await db.prepare(`
    INSERT INTO posts (
      uuid, author_user_id, title, subtitle, description, body_markdown, body_html,
      series_id, series_position, tags, published_at, created_at, updated_at, draft, noindex
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).bind(
    post.uuid, post.authorUserId, post.title, post.subtitle, post.description,
    post.bodyMarkdown, post.bodyHtml, post.seriesId, post.seriesPosition,
    post.tags, post.publishedAt, post.now, post.now, post.draft, post.noindex,
  ).first();
  try {
    await db.batch([
      db.prepare("INSERT INTO post_fts (rowid, title, subtitle, description, body) VALUES (?, ?, ?, ?, ?)")
        .bind(row.id, post.title, post.subtitle || "", post.description, plainBody),
      ...categoryIds.map((categoryId) => db.prepare("INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)").bind(row.id, categoryId)),
    ]);
  } catch (error) {
    await db.prepare("DELETE FROM posts WHERE id = ?").bind(row.id).run();
    throw error;
  }
  return row.id;
}

export async function updatePost(db, id, post, categoryIds, plainBody) {
  await db.batch([
    db.prepare(`
      UPDATE posts SET title = ?, subtitle = ?, description = ?, body_markdown = ?, body_html = ?,
        series_id = ?, series_position = ?, tags = ?, published_at = ?, updated_at = ?, draft = ?, noindex = ?
      WHERE id = ?
    `).bind(
      post.title, post.subtitle, post.description, post.bodyMarkdown, post.bodyHtml,
      post.seriesId, post.seriesPosition, post.tags, post.publishedAt, post.now,
      post.draft, post.noindex, id,
    ),
    db.prepare("DELETE FROM post_categories WHERE post_id = ?").bind(id),
    ...categoryIds.map((categoryId) => db.prepare("INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)").bind(id, categoryId)),
    db.prepare("DELETE FROM post_fts WHERE rowid = ?").bind(id),
    db.prepare("INSERT INTO post_fts (rowid, title, subtitle, description, body) VALUES (?, ?, ?, ?, ?)")
      .bind(id, post.title, post.subtitle || "", post.description, plainBody),
  ]);
}

export async function deletePost(db, id) {
  const post = await db.prepare("SELECT id, uuid FROM posts WHERE id = ?").bind(id).first();
  if (!post) return null;
  await db.batch([
    db.prepare("DELETE FROM post_fts WHERE rowid = ?").bind(id),
    db.prepare("DELETE FROM posts WHERE id = ?").bind(id),
  ]);
  return post;
}

export async function publishedForFeeds(db, includeNoindex = true) {
  const noindex = includeNoindex ? "" : "AND p.noindex = 0";
  return (await db.prepare(`
    SELECT p.id, p.title, p.description, p.published_at, p.updated_at, u.display_name AS author_name
    FROM posts AS p JOIN users AS u ON u.id = p.author_user_id
    WHERE p.draft = 0 AND p.published_at IS NOT NULL ${noindex}
    ORDER BY p.published_at DESC, p.id DESC
  `).all()).results;
}
