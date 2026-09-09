import { Router } from "express";
import { listArchiveMonths } from "../db/archive.js";

export const archiveRoutes = Router();
const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
archiveRoutes.get("/archive", async (req, res) => {
  const months = await listArchiveMonths(req.app.locals.bindings().DB);
  const years = [];
  for (const row of months) {
    let year = years.at(-1);
    if (!year || year.year !== row.year) {
      year = { year: row.year, total: 0, months: [] };
      years.push(year);
    }
    const value = `${row.year}-${String(row.month).padStart(2, "0")}`;
    const month = {
      ...row,
      from: `${value}-01`,
      to: `${value}-${lastDay(row.year, row.month)}`,
    };
    year.total += row.post_count;
    year.months.push(month);
  }
  res.renderPage("archive/index", { title: "Archive", years });
});
