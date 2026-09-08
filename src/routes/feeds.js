import { Router } from "express";
import { escapeXml } from "../lib.js";
import { publishedForFeeds } from "../db/posts.js";

export const feedRoutes = Router();
feedRoutes.get("/rss.xml", async (req, res) => {
  const site = req.app.locals.site;
  const posts = await publishedForFeeds(req.app.locals.bindings().DB, true);
  const items = posts.map((post) => `<item><title>${escapeXml(post.title)}</title><link>${site.origin}/posts/${post.id}</link><guid>${site.origin}/posts/${post.id}</guid><description>${escapeXml(post.description)}</description><dc:creator>${escapeXml(post.author_name)}</dc:creator><pubDate>${new Date(post.published_at * 1000).toUTCString()}</pubDate></item>`).join("");
  res.type("application/rss+xml").send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${escapeXml(site.name)}</title><link>${site.origin}/</link><description>MayB의 기록</description>${items}</channel></rss>`);
});
feedRoutes.get("/sitemap.xml", async (req, res) => {
  const site = req.app.locals.site;
  const posts = await publishedForFeeds(req.app.locals.bindings().DB, false);
  const urls = ["/", "/posts", "/series", "/categories", "/archive", ...posts.map((post) => `/posts/${post.id}`)];
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${escapeXml(site.origin + path)}</loc></url>`).join("")}</urlset>`);
});
feedRoutes.get("/robots.txt", (req, res) => res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${req.app.locals.site.origin}/sitemap.xml\n`));
