import { Router } from "express";
import { HttpError, integer } from "../lib.js";
import { createSeries, deleteSeries, findSeries, listSeriesWithPublishedCount, updateSeries } from "../db/series.js";
import { loadSession } from "../middleware/session.js";
import { requireActive } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";

export const seriesRoutes = Router();
seriesRoutes.get("/series", async (req, res) => res.renderPage("series", { title: "Series", series: await listSeriesWithPublishedCount(req.app.locals.bindings().DB) }));
seriesRoutes.get("/series/new", loadSession, requireActive, (req, res) => res.renderPage("series-new", { title: "New Series", user: req.user, noindex: true }));
seriesRoutes.post("/series/create", loadSession, requireActive, requireCsrf, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  if (!title || title.length > 120 || description.length > 2000) throw new HttpError(400, "시리즈 입력을 확인해 주세요.");
  await createSeries(req.app.locals.bindings().DB, title, description);
  res.redirect(303, "/series");
});
seriesRoutes.get("/series/:id/edit", loadSession, requireActive, async (req, res) => {
  const item = await findSeries(req.app.locals.bindings().DB, integer(req.params.id, 0));
  if (!item) throw new HttpError(404, "시리즈를 찾을 수 없습니다.");
  res.renderPage("series-edit", { title: "Edit Series", item, user: req.user, noindex: true });
});
seriesRoutes.post("/series/:id/update", loadSession, requireActive, requireCsrf, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  if (!title || title.length > 120 || description.length > 2000) throw new HttpError(400, "시리즈 입력을 확인해 주세요.");
  await updateSeries(req.app.locals.bindings().DB, integer(req.params.id, 0), title, description);
  res.redirect(303, "/series");
});
seriesRoutes.post("/series/:id/delete", loadSession, requireActive, requireCsrf, async (req, res) => {
  await deleteSeries(req.app.locals.bindings().DB, integer(req.params.id, 0));
  res.redirect(303, "/series");
});
