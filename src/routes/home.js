import { Router } from "express";

export const home = Router();
home.get("/", (req, res) =>
  res.renderPage("about/index", { title: "mayb-log", canonical: `${req.app.locals.site.origin}/` }),
);
