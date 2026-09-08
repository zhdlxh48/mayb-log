import { normalizeText, parseJsonList } from "./lib.js";

const publicPostSelect = `SELECT c.*, u.username, u.display_name, u.bio AS author_bio, u.homepage AS author_homepage, u.status AS author_status,
  s.title AS series_title FROM content c
  JOIN users u ON u.id = c.author_user_id
  LEFT JOIN series s ON s.slug = c.series_id
  WHERE c.kind = 'post' AND c.draft = 0 AND c.published_at IS NOT NULL`;

export async function navigationData(db) {
  const [series, categories, tags, archive] = await db.batch([
    db.prepare(
      `SELECT s.slug, s.title, count(c.id) count FROM series s JOIN content c ON c.series_id=s.slug AND c.kind='post' AND c.draft=0 GROUP BY s.slug ORDER BY s.sort_order, s.title`,
    ),
    db.prepare(
      `SELECT j.value name, count(DISTINCT c.id) count FROM content c, json_each(c.categories) j WHERE c.kind='post' AND c.draft=0 GROUP BY j.value ORDER BY j.value COLLATE NOCASE`,
    ),
    db.prepare(
      `SELECT j.value name, count(DISTINCT c.id) count FROM content c, json_each(c.tags) j WHERE c.kind='post' AND c.draft=0 GROUP BY j.value ORDER BY j.value COLLATE NOCASE`,
    ),
    db.prepare(
      `SELECT strftime('%Y', published_at, 'unixepoch', '+9 hours') year, count(*) count FROM content WHERE kind='post' AND draft=0 GROUP BY year ORDER BY year DESC`,
    ),
  ]);
  return {
    series: series.results,
    categories: categories.results,
    tags: tags.results,
    archive: archive.results,
  };
}

export async function publicPosts(db, where = "", bindings = []) {
  const result = await db
    .prepare(
      `${publicPostSelect} ${where} ORDER BY c.published_at DESC, c.slug`,
    )
    .bind(...bindings)
    .all();
  return result.results.map(decodeContent);
}

export async function publicPost(db, slug) {
  const row = await db
    .prepare(`${publicPostSelect} AND c.slug = ?`)
    .bind(slug)
    .first();
  return row ? decodeContent(row) : null;
}

export async function publicPage(db, slug) {
  const row = await db
    .prepare(
      `SELECT c.*, u.username, u.display_name FROM content c JOIN users u ON u.id=c.author_user_id WHERE c.kind='page' AND c.slug=? AND c.draft=0`,
    )
    .bind(slug)
    .first();
  return row ? decodeContent(row) : null;
}

export async function indexes(db, kind) {
  if (kind === "series") {
    const result = await db
      .prepare(
        `SELECT s.slug, s.title name, s.description, count(c.id) count FROM series s LEFT JOIN content c ON c.series_id=s.slug AND c.kind='post' AND c.draft=0 GROUP BY s.slug ORDER BY s.sort_order,s.title`,
      )
      .all();
    return result.results;
  }
  if (kind === "categories" || kind === "tags") {
    const column = kind;
    const result = await db
      .prepare(
        `SELECT j.value name, count(DISTINCT c.id) count FROM content c, json_each(c.${column}) j WHERE c.kind='post' AND c.draft=0 GROUP BY j.value ORDER BY j.value COLLATE NOCASE`,
      )
      .all();
    return result.results;
  }
  if (kind === "authors") {
    const result = await db
      .prepare(
        `SELECT u.username slug, u.display_name name, u.bio description, count(c.id) count FROM users u JOIN content c ON c.author_user_id=u.id AND c.kind='post' AND c.draft=0 GROUP BY u.id ORDER BY u.display_name`,
      )
      .all();
    return result.results;
  }
  const result = await db
    .prepare(
      `SELECT strftime('%Y', published_at, 'unixepoch', '+9 hours') year, strftime('%m', published_at, 'unixepoch', '+9 hours') month, count(*) count FROM content WHERE kind='post' AND draft=0 GROUP BY year,month ORDER BY year DESC,month DESC`,
    )
    .all();
  return result.results;
}

export function decodeContent(row) {
  return {
    ...row,
    categories: parseJsonList(row.categories),
    tags: parseJsonList(row.tags),
    draft: Boolean(row.draft),
    noindex: Boolean(row.noindex),
  };
}

export function escapeLike(value) {
  return normalizeText(value).replace(/[\\%_]/g, "\\$&");
}

export async function searchData(db, query) {
  const like = `%${escapeLike(query)}%`;
  const [posts, series, authors, categories, tags, archive] = await db.batch([
    db
      .prepare(
        `${publicPostSelect} AND c.search_text LIKE ? ESCAPE '\\' ORDER BY c.published_at DESC`,
      )
      .bind(like),
    db
      .prepare(
        `SELECT slug,title name,description FROM series WHERE lower(title || ' ' || description) LIKE ? ESCAPE '\\' ORDER BY sort_order,title`,
      )
      .bind(like),
    db
      .prepare(
        `SELECT DISTINCT u.username slug,u.display_name name,u.bio description FROM users u JOIN content c ON c.author_user_id=u.id AND c.kind='post' AND c.draft=0 WHERE lower(u.display_name || ' ' || u.username || ' ' || u.bio) LIKE ? ESCAPE '\\' ORDER BY u.display_name`,
      )
      .bind(like),
    db
      .prepare(
        `SELECT DISTINCT j.value name FROM content c,json_each(c.categories) j WHERE c.kind='post' AND c.draft=0 AND lower(j.value) LIKE ? ESCAPE '\\' ORDER BY j.value`,
      )
      .bind(like),
    db
      .prepare(
        `SELECT DISTINCT j.value name FROM content c,json_each(c.tags) j WHERE c.kind='post' AND c.draft=0 AND lower(j.value) LIKE ? ESCAPE '\\' ORDER BY j.value`,
      )
      .bind(like),
    db
      .prepare(
        `SELECT DISTINCT strftime('%Y-%m',published_at,'unixepoch','+9 hours') name FROM content WHERE kind='post' AND draft=0 AND strftime('%Y-%m',published_at,'unixepoch','+9 hours') LIKE ? ESCAPE '\\' ORDER BY name DESC`,
      )
      .bind(like),
  ]);
  return {
    posts: posts.results.map(decodeContent),
    series: series.results,
    authors: authors.results,
    categories: categories.results,
    tags: tags.results,
    archive: archive.results,
  };
}
