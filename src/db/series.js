export async function listSeriesWithPublishedCount(db) {
  return (await db.prepare(`
    SELECT s.id, s.title, s.description, COUNT(p.id) AS post_count
    FROM series AS s
    LEFT JOIN posts AS p ON p.series_id = s.id AND p.draft = 0 AND p.published_at IS NOT NULL
    GROUP BY s.id
    ORDER BY s.title COLLATE NOCASE, s.id
  `).all()).results;
}

export function findSeries(db, id) {
  return db.prepare("SELECT id, title, description FROM series WHERE id = ?").bind(id).first();
}

export async function createSeries(db, title, description = "") {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare("INSERT INTO series (title, description, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id")
    .bind(title, description, now, now).first();
}

export function updateSeries(db, id, title, description) {
  return db.prepare("UPDATE series SET title = ?, description = ?, updated_at = ? WHERE id = ?")
    .bind(title, description, Math.floor(Date.now() / 1000), id).run();
}

export function deleteSeries(db, id) {
  return db.batch([
    db.prepare("UPDATE posts SET series_id = NULL, series_position = NULL WHERE series_id = ?").bind(id),
    db.prepare("DELETE FROM series WHERE id = ?").bind(id),
  ]);
}

export async function findOrCreateSeries(db, selectedId, newTitle) {
  if (selectedId && newTitle) throw new Error("기존 시리즈와 새 시리즈를 동시에 선택할 수 없습니다.");
  if (newTitle) return (await createSeries(db, newTitle.trim(), "")).id;
  return selectedId || null;
}
