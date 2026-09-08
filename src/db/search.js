import { PAGE_SIZE, dateEpoch, integer, positiveIds, uniqueText } from "../lib.js";

export const escapeLike = (value) => String(value).replace(/[\\%_]/g, "\\$&");
export const ftsPhrase = (value) => `"${String(value).replaceAll('"', '""')}"`;

export function parseSearch(query) {
  const q = String(query.q || "").trim();
  return {
    q,
    series: positiveIds(query.series),
    categories: positiveIds(query.category),
    tags: uniqueText(query.tag),
    from: String(query.from || ""),
    to: String(query.to || ""),
    fromEpoch: dateEpoch(query.from),
    toEpoch: dateEpoch(query.to),
    page: integer(query.page),
  };
}

export function searchQuery(filters) {
  const clauses = ["p.draft = 0", "p.published_at IS NOT NULL"];
  const params = [];
  if (filters.q) {
    if ([...filters.q].length >= 3) {
      clauses.push("p.id IN (SELECT rowid FROM post_fts WHERE post_fts MATCH ?)");
      params.push(ftsPhrase(filters.q));
    } else {
      const like = `%${escapeLike(filters.q)}%`;
      clauses.push("(p.title LIKE ? ESCAPE '\\' OR COALESCE(p.subtitle, '') LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\' OR p.body_markdown LIKE ? ESCAPE '\\')");
      params.push(like, like, like, like);
    }
  }
  if (filters.series.length) {
    clauses.push(`p.series_id IN (${filters.series.map(() => "?").join(",")})`);
    params.push(...filters.series);
  }
  if (filters.categories.length) {
    clauses.push(`p.id IN (
      SELECT pc.post_id FROM post_categories AS pc
      WHERE pc.category_id IN (${filters.categories.map(() => "?").join(",")})
      GROUP BY pc.post_id HAVING COUNT(DISTINCT pc.category_id) = ?
    )`);
    params.push(...filters.categories, filters.categories.length);
  }
  for (const tag of filters.tags) {
    clauses.push("EXISTS (SELECT 1 FROM json_each(p.tags) AS jt WHERE jt.value = ?)");
    params.push(tag);
  }
  if (filters.fromEpoch != null) { clauses.push("p.published_at >= ?"); params.push(filters.fromEpoch); }
  if (filters.toEpoch != null) { clauses.push("p.published_at < ?"); params.push(filters.toEpoch); }
  return { where: clauses.join(" AND "), params };
}

export async function searchPosts(db, filters, includeOptions = true) {
  const { where, params } = searchQuery(filters);
  const statements = [];
  if (includeOptions) {
    statements.push(db.prepare("SELECT id, title FROM series ORDER BY title COLLATE NOCASE, id"));
    statements.push(db.prepare("SELECT id, name FROM categories ORDER BY name COLLATE NOCASE, id"));
  }
  statements.push(db.prepare(`SELECT COUNT(p.id) AS total FROM posts AS p WHERE ${where}`).bind(...params));
  statements.push(db.prepare(`
    SELECT p.id, p.uuid, p.title, p.subtitle, p.description, p.tags, p.published_at,
           u.display_name AS author_name, s.id AS series_id, s.title AS series_title,
           COALESCE((
             SELECT json_group_array(json_object('id', c.id, 'name', c.name))
             FROM post_categories AS pc JOIN categories AS c ON c.id = pc.category_id
             WHERE pc.post_id = p.id
           ), '[]') AS categories_json
    FROM posts AS p
    JOIN users AS u ON u.id = p.author_user_id
    LEFT JOIN series AS s ON s.id = p.series_id
    WHERE ${where}
    ORDER BY p.published_at DESC, p.id DESC
    LIMIT ? OFFSET ?
  `).bind(...params, PAGE_SIZE, (filters.page - 1) * PAGE_SIZE));
  const results = await db.batch(statements);
  let index = 0;
  const series = includeOptions ? results[index++].results : null;
  const categories = includeOptions ? results[index++].results : null;
  const total = results[index++].results[0].total;
  const posts = results[index].results;
  return { series, categories, total, posts };
}

export function searchParams(filters, page) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const id of filters.series) params.append("series", id);
  for (const id of filters.categories) params.append("category", id);
  for (const tag of filters.tags) params.append("tag", tag);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page > 1) params.set("page", page);
  return params;
}
