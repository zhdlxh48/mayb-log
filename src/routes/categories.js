import { Router } from "express";
import { HttpError, integer } from "../lib.js";
import {
  createCategory,
  deleteCategory,
  findCategory,
  listCategoriesWithPublishedCount,
  updateCategory,
} from "../db/categories.js";
import { loadSession } from "../middleware/session.js";
import { requireActive } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";

export const categoryRoutes = Router();
categoryRoutes.get("/categories", async (req, res) =>
  res.renderPage("categories/index", {
    title: "Categories",
    categories: await listCategoriesWithPublishedCount(req.app.locals.bindings().DB),
  }),
);
categoryRoutes.get("/categories/new", loadSession, requireActive, (req, res) =>
  res.renderPage("categories/new", { title: "New Category", user: req.user, noindex: true }),
);
categoryRoutes.post(
  "/categories/create",
  loadSession,
  requireActive,
  requireCsrf,
  async (req, res) => {
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    if (!name || name.length > 120 || description.length > 2000)
      throw new HttpError(400, "카테고리 입력을 확인해 주세요.");
    await createCategory(req.app.locals.bindings().DB, name, description);
    res.redirect(303, "/categories");
  },
);
categoryRoutes.get("/categories/:id/edit", loadSession, requireActive, async (req, res) => {
  const item = await findCategory(req.app.locals.bindings().DB, integer(req.params.id, 0));
  if (!item) throw new HttpError(404, "카테고리를 찾을 수 없습니다.");
  res.renderPage("categories/edit", {
    title: "Edit Category",
    item,
    user: req.user,
    noindex: true,
  });
});
categoryRoutes.post(
  "/categories/:id/update",
  loadSession,
  requireActive,
  requireCsrf,
  async (req, res) => {
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    if (!name || name.length > 120 || description.length > 2000)
      throw new HttpError(400, "카테고리 입력을 확인해 주세요.");
    await updateCategory(
      req.app.locals.bindings().DB,
      integer(req.params.id, 0),
      name,
      description,
    );
    res.redirect(303, "/categories");
  },
);
categoryRoutes.post(
  "/categories/:id/delete",
  loadSession,
  requireActive,
  requireCsrf,
  async (req, res) => {
    await deleteCategory(req.app.locals.bindings().DB, integer(req.params.id, 0));
    res.redirect(303, "/categories");
  },
);
