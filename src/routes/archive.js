import { Router } from "express";
import { listArchiveMonths } from "../db/archive.js";

export const archiveRoutes = Router();
archiveRoutes.get("/archive", async (req, res) => {
  const months = await listArchiveMonths(req.app.locals.bindings().DB);
  const years = [];
  for (const row of months) {
    let year = years.at(-1);
    if (!year || year.year !== row.year) {
      year = { year: row.year, total: 0, months: [] };
      years.push(year);
    }
    const next = row.month === 12 ? `${row.year + 1}-01-01` : `${row.year}-${String(row.month + 1).padStart(2, "0")}-01`;
    const month = { ...row, from: `${row.year}-${String(row.month).padStart(2, "0")}-01`, to: next };
    year.total += row.post_count;
    year.months.push(month);
  }
  res.renderPage("archive", { title: "Archive", years });
});
