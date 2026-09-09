import deleteQuery from "./queries/categories/delete.sql";
import findById from "./queries/categories/find-by-id.sql";
import findByNames from "./queries/categories/find-by-names.sql";
import insertIfMissing from "./queries/categories/insert-if-missing.sql";
import insertQuery from "./queries/categories/insert.sql";
import listWithCount from "./queries/categories/list-with-count.sql";
import updateQuery from "./queries/categories/update.sql";

export async function listCategoriesWithPublishedCount(db) {
  return (await db.prepare(listWithCount).all()).results;
}

export const findCategory = (db, id) => db.prepare(findById).bind(id).first();

export function createCategory(db, name, description = "") {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(insertQuery).bind(name, description, now, now).first();
}

export const updateCategory = (db, id, name, description) =>
  db
    .prepare(updateQuery)
    .bind(name, description, Math.floor(Date.now() / 1000), id)
    .run();

export const deleteCategory = (db, id) => db.prepare(deleteQuery).bind(id).run();

export async function findOrCreateCategories(db, selectedIds, newNames) {
  const now = Math.floor(Date.now() / 1000);
  if (newNames.length) {
    await db.batch(newNames.map((name) => db.prepare(insertIfMissing).bind(name, now, now)));
  }
  const created = newNames.length
    ? (await db.prepare(findByNames).bind(JSON.stringify(newNames)).all()).results.map(
        ({ id }) => id,
      )
    : [];
  return [...new Set([...selectedIds, ...created])];
}
