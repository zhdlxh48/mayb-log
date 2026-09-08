import { html, kstParts, slugify } from "./lib.js";
import {
  indexes,
  publicPage,
  publicPost,
  publicPosts,
  searchData,
} from "./data.js";
import { article, indexList, layout, pagination, postList } from "./views.js";

const titles = {
  series: "Series",
  categories: "Categories",
  tags: "Tags",
  authors: "Authors",
  archive: "Archive",
};

export async function publicRoute(context) {
  const { request, env, url, session, nav } = context;
  if (request.method !== "GET") return null;

  if (url.pathname === "/") {
    const page = await publicPage(env.DB, "about");
    return html(
      layout(env, nav, session, {
        title: page?.title || env.SITE_NAME,
        description: page?.description,
        canonical: "/",
        body: `<article class="article-body">${page?.body_html || "<p>소개 글을 작성해 주세요.</p>"}</article>`,
      }),
    );
  }

  if (url.pathname === "/posts" || url.pathname === "/posts/") {
    return page(
      context,
      "Posts",
      "공개된 모든 글입니다.",
      postList(await publicPosts(env.DB)),
      "/posts",
    );
  }

  let match = url.pathname.match(/^\/posts\/([^/]+)\/?$/);
  if (match) {
    const post = await publicPost(env.DB, decodeURIComponent(match[1]));
    if (!post) return null;
    const all = await publicPosts(env.DB);
    const index = all.findIndex((item) => item.id === post.id);
    const neighbours = { next: all[index - 1], previous: all[index + 1] };
    let seriesNeighbours = {};
    if (post.series_id) {
      const seriesPosts = (
        await publicPosts(env.DB, "AND c.series_id = ?", [post.series_id])
      ).sort((a, b) => a.series_order - b.series_order);
      const seriesIndex = seriesPosts.findIndex((item) => item.id === post.id);
      seriesNeighbours = {
        previous: seriesPosts[seriesIndex - 1],
        next: seriesPosts[seriesIndex + 1],
      };
    }
    return html(
      layout(env, nav, session, {
        title: post.title,
        description: post.description,
        canonical: `/posts/${post.slug}`,
        noindex: post.noindex,
        article: post,
        body: article(post, neighbours, seriesNeighbours),
      }),
    );
  }

  for (const kind of Object.keys(titles)) {
    if (url.pathname === `/${kind}` || url.pathname === `/${kind}/`) {
      return page(
        context,
        titles[kind],
        `${titles[kind]}별 글 모음입니다.`,
        indexList(kind, await indexes(env.DB, kind)),
        `/${kind}`,
      );
    }
  }

  match = url.pathname.match(
    /^\/(series|categories|tags|authors)\/([^/]+)\/?$/,
  );
  if (match) {
    const [, kind, raw] = match;
    const key = decodeURIComponent(raw);
    let posts;
    let title = key;
    if (kind === "series") {
      posts = await publicPosts(env.DB, "AND c.series_id = ?", [key]);
      title = posts[0]?.series_title || key;
    } else if (kind === "authors") {
      posts = await publicPosts(env.DB, "AND u.username = ?", [key]);
      if (posts[0]?.author_status === "pending") return null;
      title = posts[0]?.display_name || key;
    } else {
      const column = kind === "categories" ? "categories" : "tags";
      const all = await publicPosts(env.DB);
      posts = all.filter((post) =>
        post[column].some((value) => slugify(value) === key),
      );
      const original = posts
        .flatMap((post) => post[column])
        .find((value) => slugify(value) === key);
      title = original || key;
    }
    if (!posts.length && kind !== "series") return null;
    const authorIntro =
      kind === "authors" && posts[0]
        ? `${posts[0].author_bio ? `<p>${escapeAttribute(posts[0].author_bio)}</p>` : ""}${posts[0].author_homepage ? `<p><a href="${escapeAttribute(posts[0].author_homepage)}">홈페이지</a></p>` : ""}`
        : "";
    return page(
      context,
      title,
      `${title}에 속한 글입니다.`,
      authorIntro + postList(posts),
      `/${kind}/${encodeURIComponent(key)}`,
    );
  }

  match = url.pathname.match(/^\/archive\/(\d{4})(?:\/(\d{2}))?\/?$/);
  if (match) {
    const [, year, month] = match;
    const posts = (await publicPosts(env.DB)).filter((post) => {
      const parts = kstParts(post.published_at);
      return parts.year === year && (!month || parts.month === month);
    });
    return page(
      context,
      month ? `${year}년 ${Number(month)}월` : `${year}년`,
      "서울 시간 기준 글 모음입니다.",
      postList(posts),
      url.pathname.replace(/\/$/, ""),
    );
  }

  if (url.pathname === "/search" || url.pathname === "/search/")
    return searchPage(context);
  if (url.pathname === "/rss.xml") return rss(context);
  if (url.pathname === "/sitemap.xml") return sitemap(context);
  if (url.pathname === "/robots.txt")
    return new Response(
      `User-agent: *\nAllow: /\nSitemap: ${env.SITE_ORIGIN}/sitemap.xml\n`,
      { headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  return null;
}

function page(context, title, description, body, canonical) {
  return html(
    layout(context.env, context.nav, context.session, {
      title,
      description,
      body,
      canonical,
    }),
  );
}

const filterLabels = {
  all: "All",
  posts: "Posts",
  series: "Series",
  categories: "Categories",
  tags: "Tags",
  authors: "Authors",
  archive: "Archive",
};

async function searchPage(context) {
  const { request, env, url, session, nav } = context;
  const query = String(url.searchParams.get("q") || "")
    .trim()
    .slice(0, 100);
  const type = filterLabels[url.searchParams.get("type")]
    ? url.searchParams.get("type")
    : "all";
  const currentPage = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") || "1", 10) || 1,
  );
  const data = query
    ? await searchData(env.DB, query)
    : {
        posts: [],
        series: [],
        categories: [],
        tags: [],
        authors: [],
        archive: [],
      };
  const results = searchResults(query, type, currentPage, data);
  if (request.headers.get("HX-Request") === "true") return html(results);
  const form = `<form class="search-form" action="/search" method="get" hx-get="/search" hx-target="#search-results" hx-swap="outerHTML" hx-push-url="true"><label for="search-query">검색어</label><input id="search-query" type="search" name="q" value="${escapeAttribute(query)}" maxlength="100"><button type="submit">검색</button><fieldset><legend>종류</legend>${Object.entries(
    filterLabels,
  )
    .map(
      ([value, label]) =>
        `<label><input type="radio" name="type" value="${value}"${type === value ? " checked" : ""}> ${label}</label>`,
    )
    .join("")}</fieldset></form>${results}`;
  return html(
    layout(env, nav, session, {
      title: "Search",
      description: "글과 분류를 검색합니다.",
      canonical: `/search${url.search}`,
      noindex: true,
      body: form,
      htmx: true,
    }),
  );
}

export function searchResults(query, type, currentPage, data) {
  if (!query)
    return '<section id="search-results" class="search-results"><p>검색어를 입력해 주세요.</p></section>';
  if (type === "all") {
    const sections = Object.entries(filterLabels)
      .filter(([key]) => key !== "all")
      .map(([key, label]) => {
        const items = data[key] || [];
        if (!items.length) return "";
        const shown = items.slice(0, 10);
        return `<section class="search-section"><h2>${label}</h2>${searchItems(key, shown)}${items.length > 10 ? `<p><a href="?q=${encodeURIComponent(query)}&type=${key}">More</a></p>` : ""}</section>`;
      })
      .join("");
    return `<div id="search-results" class="search-results" data-filter="all" hx-boost="true" hx-target="this" hx-swap="outerHTML" hx-push-url="true">${sections || "<p>검색 결과가 없습니다.</p>"}</div>`;
  }
  const items = data[type] || [];
  const last = Math.max(1, Math.ceil(items.length / 20));
  const page = Math.min(currentPage, last);
  const shown = items.slice((page - 1) * 20, page * 20);
  return `<div id="search-results" class="search-results" data-filter="${type}" hx-boost="true" hx-target="this" hx-swap="outerHTML" hx-push-url="true"><h2>${filterLabels[type]}</h2>${searchItems(type, shown)}${pagination(query, type, page, items.length)}</div>`;
}

function searchItems(type, items) {
  if (!items.length) return "<p>검색 결과가 없습니다.</p>";
  if (type === "posts") return postList(items);
  return `<ul>${items
    .map((item) => {
      const name = item.name;
      const slug =
        item.slug ||
        (type === "archive" ? name.replace("-", "/") : slugify(name));
      return `<li><a href="/${type}/${encodeURI(slug)}">${escapeAttribute(name)}</a>${item.description ? ` — ${escapeAttribute(item.description)}` : ""}</li>`;
    })
    .join("")}</ul>`;
}

const escapeAttribute = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const xml = escapeAttribute;

async function rss({ env }) {
  const posts = await publicPosts(env.DB);
  const items = posts
    .map(
      (post) =>
        `<item><title>${xml(post.title)}</title><link>${xml(`${env.SITE_ORIGIN}/posts/${post.slug}`)}</link><guid>${xml(`${env.SITE_ORIGIN}/posts/${post.slug}`)}</guid><description>${xml(post.description)}</description><pubDate>${new Date(post.published_at * 1000).toUTCString()}</pubDate><dc:creator>${xml(post.display_name)}</dc:creator></item>`,
    )
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${xml(env.SITE_NAME)}</title><link>${xml(env.SITE_ORIGIN)}</link><description>MayB의 개인 아카이브</description>${items}</channel></rss>`,
    { headers: { "content-type": "application/rss+xml; charset=utf-8" } },
  );
}

async function sitemap({ env }) {
  const posts = (await publicPosts(env.DB)).filter((post) => !post.noindex);
  const [series, categories, tags, authors, archive] = await Promise.all(
    ["series", "categories", "tags", "authors", "archive"].map((kind) =>
      indexes(env.DB, kind),
    ),
  );
  const staticPaths = [
    "",
    "/posts",
    "/series",
    "/categories",
    "/tags",
    "/authors",
    "/archive",
  ];
  const detailPaths = [
    ...series.map((item) => `/series/${item.slug}`),
    ...categories.map((item) => `/categories/${slugify(item.name)}`),
    ...tags.map((item) => `/tags/${slugify(item.name)}`),
    ...authors.map((item) => `/authors/${item.slug}`),
    ...archive.map((item) => `/archive/${item.year}/${item.month}`),
  ];
  const paths = [
    ...staticPaths,
    ...detailPaths,
    ...posts.map((post) => `/posts/${post.slug}`),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${xml(`${env.SITE_ORIGIN}${path}`)}</loc></url>`).join("")}</urlset>`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
}
