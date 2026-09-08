import express from "express";
import { cookies } from "./lib.js";
import { renderer } from "./render.js";
import { home } from "./routes/home.js";
import { postRoutes } from "./routes/posts.js";
import { seriesRoutes } from "./routes/series.js";
import { categoryRoutes } from "./routes/categories.js";
import { archiveRoutes } from "./routes/archive.js";
import { searchRoutes } from "./routes/search.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profile.js";
import { mediaRoutes } from "./routes/media.js";
import { feedRoutes } from "./routes/feeds.js";
import { errors, notFound } from "./middleware/errors.js";

export function createApp(getBindings) {
  const app = express();
  const bindings = getBindings();
  const site = { name: bindings.SITE_NAME || "mayb-log", origin: new URL(bindings.SITE_ORIGIN).origin, turnstileSiteKey: bindings.TURNSTILE_SITE_KEY };
  app.set("trust proxy", true);
  app.locals.bindings = getBindings;
  app.locals.site = site;
  app.locals.render = renderer(site);
  app.use(express.urlencoded({ extended: false, limit: "256kb" }));
  app.use((req, res, next) => {
    res.set({
      "Content-Security-Policy": "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; img-src 'self' data: blob:; style-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    const hasSession = Boolean(cookies(req.headers.cookie).session);
    res.renderPage = (name, data = {}) => res.type("html").send(app.locals.render(name, { ...data, hasSession }));
    next();
  });
  app.use(home, postRoutes, seriesRoutes, categoryRoutes, archiveRoutes, searchRoutes, authRoutes, profileRoutes, mediaRoutes, feedRoutes);
  app.use(notFound);
  app.use(errors);
  return app;
}
