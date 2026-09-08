export async function listArchiveMonths(db) {
  return (await db.prepare(`
    SELECT CAST(strftime('%Y', published_at, 'unixepoch', '+9 hours') AS INTEGER) AS year,
           CAST(strftime('%m', published_at, 'unixepoch', '+9 hours') AS INTEGER) AS month,
           COUNT(id) AS post_count
    FROM posts
    WHERE draft = 0 AND published_at IS NOT NULL
    GROUP BY year, month
    ORDER BY year DESC, month DESC
  `).all()).results;
}
