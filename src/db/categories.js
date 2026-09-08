export async function listCategoriesWithPublishedCount(db) {
  return (await db.prepare(`
    SELECT c.id, c.name, c.description, COUNT(p.id) AS post_count
    FROM categories AS c
    LEFT JOIN post_categories AS pc ON pc.category_id = c.id
    LEFT JOIN posts AS p ON p.id = pc.post_id AND p.draft = 0 AND p.published_at IS NOT NULL
    GROUP BY c.id
    ORDER BY c.name COLLATE NOCASE, c.id
  `).all()).results;
}

export function findCategory(db, id) {
  return db.prepare("SELECT id, name, description FROM categories WHERE id = ?").bind(id).first();
}

export async function createCategory(db, name, description = "") {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare("INSERT INTO categories (name, description, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id")
    .bind(name, description, now, now).first();
}

export function updateCategory(db, id, name, description) {
  return db.prepare("UPDATE categories SET name = ?, description = ?, updated_at = ? WHERE id = ?")
    .bind(name, description, Math.floor(Date.now() / 1000), id).run();
}

export function deleteCategory(db, id) {
  return db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
}

export async function findOrCreateCategories(db, selectedIds, newNames) {
  const now = Math.floor(Date.now() / 1000);
  if (newNames.length) await db.batch(newNames.map((name) => db.prepare(`
    INSERT INTO categories (name, description, created_at, updated_at)
    VALUES (?, '', ?, ?) ON CONFLICT(name) DO NOTHING
  `).bind(name, now, now)));
  const created = newNames.length ? (await db.prepare(`
    SELECT id FROM categories WHERE name IN (${newNames.map(() => "?").join(",")})
  `).bind(...newNames).all()).results.map((row) => row.id) : [];
  return [...new Set([...selectedIds, ...created])];
}
