import monthsQuery from "./queries/archive/months.sql";

export async function listArchiveMonths(db) {
  return (await db.prepare(monthsQuery).all()).results;
}
