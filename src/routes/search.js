import { Router } from "express";
import { pageBlock } from "../lib.js";
import { searchPosts } from "../db/search.js";
import { parseSearch, searchParams } from "../search.js";

export const searchRoutes = Router();
searchRoutes.get("/search", async (req, res) => {
  const filters = parseSearch(req.query);
  if (!filters.page) {
    filters.page = 1;
    return res.redirect(303, `/search?${searchParams(filters, 1)}`);
  }
  const fragment = req.get("HX-Request") === "true";
  const result = await searchPosts(req.app.locals.bindings().DB, filters, !fragment);
  const pager = pageBlock(filters.page, result.total);
  const pageUrl = (page) => `/search?${searchParams(filters, page)}`;
  if (filters.page > pager.last) return res.redirect(303, pageUrl(pager.last));
  if (fragment)
    return res.send(req.app.locals.render("search/results", { ...result, pager, pageUrl }, true));
  res.renderPage("search/index", {
    title: "Search",
    noindex: true,
    filters,
    ...result,
    pager,
    pageUrl,
    scripts: ["/vendor/htmx.min.js", "/search.js"],
  });
});
