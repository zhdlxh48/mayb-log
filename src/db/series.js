import deleteQuery from "./queries/series/delete.sql";
import detachPosts from "./queries/series/detach-posts.sql";
import findById from "./queries/series/find-by-id.sql";
import insertQuery from "./queries/series/insert.sql";
import listWithCount from "./queries/series/list-with-count.sql";
import updateQuery from "./queries/series/update.sql";

export async function listSeriesWithPublishedCount(db) {
  return (await db.prepare(listWithCount).all()).results;
}

export const findSeries = (db, id) => db.prepare(findById).bind(id).first();

export function createSeries(db, title, description = "") {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(insertQuery).bind(title, description, now, now).first();
}

export const updateSeries = (db, id, title, description) =>
  db
    .prepare(updateQuery)
    .bind(title, description, Math.floor(Date.now() / 1000), id)
    .run();

export const deleteSeries = (db, id) =>
  db.batch([db.prepare(detachPosts).bind(id), db.prepare(deleteQuery).bind(id)]);

export async function findOrCreateSeries(db, selectedId, newTitle) {
  if (selectedId && newTitle)
    throw new Error("기존 시리즈와 새 시리즈를 동시에 선택할 수 없습니다.");
  if (newTitle) return (await createSeries(db, newTitle.trim())).id;
  return selectedId || null;
}
