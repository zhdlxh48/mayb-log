import { absoluteUrl, dateTime, escapeHtml, slugify } from "./lib.js";

const list = (items, href) =>
  items.length
    ? `<ul>${items.map((item) => `<li><a href="${href(item)}">${escapeHtml(item.title || item.name || item.year)}</a> <small>(${item.count})</small></li>`).join("")}</ul>`
    : "<p>아직 항목이 없습니다.</p>";

export function layout(
  env,
  nav,
  session,
  {
    title,
    description = "",
    body,
    canonical = "/",
    noindex = false,
    article,
    scripts = "",
    htmx = false,
  },
) {
  const site = escapeHtml(env.SITE_NAME || "mayb-log");
  const url = absoluteUrl(env, canonical);
  const fullTitle =
    title === env.SITE_NAME ? site : `${escapeHtml(title)} | ${site}`;
  const menus = [
    [
      "Series",
      "series",
      nav.series,
      (i) => `/series/${encodeURIComponent(i.slug)}`,
    ],
    [
      "Categories",
      "categories",
      nav.categories,
      (i) => `/categories/${encodeURIComponent(slugify(i.name))}`,
    ],
    [
      "Tags",
      "tags",
      nav.tags,
      (i) => `/tags/${encodeURIComponent(slugify(i.name))}`,
    ],
    ["Archive", "archive", nav.archive, (i) => `/archive/${i.year}`],
  ];
  const menuHtml = menus
    .map(
      ([label, path, items, href]) =>
        `<span class="nav-group"><a href="/${path}">${label}</a><button type="button" popovertarget="${path}-menu" aria-label="${label} 빠른 메뉴">▾</button></span><div class="nav-popover" id="${path}-menu" popover>${list(items, href)}</div>`,
    )
    .join("");
  const authLinks = session
    ? `<a href="/admin/posts/new">Write</a><a href="/account">Account</a>${session.role === "admin" ? '<a href="/admin">Admin</a>' : ""}`
    : '<a href="/login">Login</a><a href="/signup">Sign up</a>';
  const jsonLd = article
    ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: article.title, description: article.description, datePublished: new Date(article.published_at * 1000).toISOString(), dateModified: new Date(article.updated_at * 1000).toISOString(), author: { "@type": "Person", name: article.display_name, url: absoluteUrl(env, `/authors/${article.username}`) }, mainEntityOfPage: url, ...(article.image_key ? { image: absoluteUrl(env, `/media/${article.image_key}`) } : {}) }).replaceAll("<", "\\u003c")}</script>`
    : "";
  const articleMeta = article
    ? `<meta property="article:published_time" content="${new Date(article.published_at * 1000).toISOString()}"><meta property="article:modified_time" content="${new Date(article.updated_at * 1000).toISOString()}">`
    : "";
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${fullTitle}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(url)}">${noindex ? '<meta name="robots" content="noindex,follow">' : ""}<meta property="og:title" content="${fullTitle}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(url)}"><meta property="og:type" content="${article ? "article" : "website"}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${fullTitle}"><meta name="twitter:description" content="${escapeHtml(description)}">${articleMeta}${article?.image_key ? `<meta property="og:image" content="${escapeHtml(absoluteUrl(env, `/media/${article.image_key}`))}"><meta name="twitter:image" content="${escapeHtml(absoluteUrl(env, `/media/${article.image_key}`))}">` : ""}<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/site.css">${article?.body_html?.includes("language-") ? '<link rel="stylesheet" href="/vendor/prism.css">' : ""}${htmx ? '<script src="/vendor/htmx.min.js" defer></script>' : ""}${jsonLd}</head><body><a class="skip-link" href="#content">본문으로 건너뛰기</a><header class="site-header"><nav class="site-nav" aria-label="주요 메뉴"><a class="site-name" href="/">${site}</a><a href="/">About</a><a href="/posts">Posts</a>${menuHtml}<a href="/search">Search</a>${authLinks}</nav></header><main id="content" class="page"><h1>${escapeHtml(title)}</h1>${body}</main><footer class="site-footer"><p>© ${new Date().getFullYear()} ${site} · <a href="/rss.xml">RSS</a></p></footer>${article?.body_html?.includes("language-") ? '<script src="/vendor/prism.js" defer></script>' : ""}${scripts}</body></html>`;
}

export function postList(posts) {
  if (!posts.length) return "<p>아직 공개된 글이 없습니다.</p>";
  return `<ol class="post-list">${posts.map((post) => `<li class="post-item"><article><h2><a href="/posts/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h2>${post.subtitle ? `<p class="post-subtitle">${escapeHtml(post.subtitle)}</p>` : ""}<p>${escapeHtml(post.description)}</p><p class="post-meta"><time datetime="${new Date(post.published_at * 1000).toISOString()}">${dateTime(post.published_at)}</time> · <a href="/authors/${encodeURIComponent(post.username)}">${escapeHtml(post.display_name)}</a>${post.series_id ? ` · <a href="/series/${encodeURIComponent(post.series_id)}">${escapeHtml(post.series_title)}</a>` : ""}</p>${taxonomyLinks("Categories", post.categories, "categories")}${taxonomyLinks("Tags", post.tags, "tags")}</article></li>`).join("")}</ol>`;
}

const taxonomyLinks = (label, values, path) =>
  values?.length
    ? `<p class="taxonomy"><span>${label}:</span> ${values.map((value) => `<a href="/${path}/${encodeURIComponent(slugify(value))}">${escapeHtml(value)}</a>`).join(", ")}</p>`
    : "";

export function article(post, neighbours = {}, seriesNeighbours = {}) {
  const seriesNav = post.series_id
    ? `<nav class="post-navigation" aria-label="시리즈 글">${seriesNeighbours.previous ? `<a href="/posts/${seriesNeighbours.previous.slug}">← 시리즈: ${escapeHtml(seriesNeighbours.previous.title)}</a>` : "<span></span>"}${seriesNeighbours.next ? `<a href="/posts/${seriesNeighbours.next.slug}">시리즈: ${escapeHtml(seriesNeighbours.next.title)} →</a>` : ""}</nav>`
    : "";
  return `<article class="article"><header class="article-header">${post.subtitle ? `<p class="post-subtitle">${escapeHtml(post.subtitle)}</p>` : ""}<p>${escapeHtml(post.description)}</p><p class="post-meta"><time datetime="${new Date(post.published_at * 1000).toISOString()}">${dateTime(post.published_at)}</time> · <a href="/authors/${encodeURIComponent(post.username)}">${escapeHtml(post.display_name)}</a></p>${taxonomyLinks("Categories", post.categories, "categories")}${taxonomyLinks("Tags", post.tags, "tags")}</header>${seriesNav}<div class="article-body">${post.body_html}</div><nav class="post-navigation" aria-label="이전 및 다음 글">${neighbours.previous ? `<a rel="prev" href="/posts/${neighbours.previous.slug}">← ${escapeHtml(neighbours.previous.title)}</a>` : "<span></span>"}${neighbours.next ? `<a rel="next" href="/posts/${neighbours.next.slug}">${escapeHtml(neighbours.next.title)} →</a>` : ""}</nav></article>`;
}

export function indexList(kind, items) {
  if (!items.length) return "<p>아직 항목이 없습니다.</p>";
  if (kind === "archive")
    return `<ul class="index-list">${items.map((item) => `<li><a href="/archive/${item.year}/${item.month}">${item.year}년 ${Number(item.month)}월</a> <small>(${item.count})</small></li>`).join("")}</ul>`;
  return `<ul class="index-list">${items.map((item) => `<li><a href="/${kind}/${encodeURIComponent(item.slug || slugify(item.name))}">${escapeHtml(item.name)}</a> <small>(${item.count})</small>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</li>`).join("")}</ul>`;
}

export function field(name, label, value = "", options = {}) {
  const id = `field-${name}`;
  if (options.type === "textarea")
    return `<div class="form-field"><label for="${id}">${label}</label><textarea id="${id}" name="${name}"${options.required ? " required" : ""}>${escapeHtml(value)}</textarea></div>`;
  if (options.type === "checkbox")
    return `<div class="form-field checkbox"><input id="${id}" name="${name}" type="checkbox" value="1"${value ? " checked" : ""}><label for="${id}">${label}</label></div>`;
  return `<div class="form-field"><label for="${id}">${label}</label><input id="${id}" name="${name}" type="${options.type || "text"}" value="${escapeHtml(value)}"${options.required ? " required" : ""}${options.minlength ? ` minlength="${options.minlength}"` : ""}${options.maxlength ? ` maxlength="${options.maxlength}"` : ""}></div>`;
}

export function message(text, kind = "error") {
  return text
    ? `<p id="form-error" class="message" role="${kind === "error" ? "alert" : "status"}" data-kind="${kind}">${escapeHtml(text)}</p>`
    : "";
}

export function pagination(query, type, page, total) {
  const last = Math.max(1, Math.ceil(total / 20));
  if (last <= 1) return "";
  const groupStart = Math.floor((page - 1) / 10) * 10 + 1;
  const groupEnd = Math.min(last, groupStart + 9);
  const link = (target, label, current = false) =>
    current
      ? `<a aria-current="page" href="?q=${encodeURIComponent(query)}&type=${type}&page=${target}">${label}</a>`
      : `<a href="?q=${encodeURIComponent(query)}&type=${type}&page=${target}">${label}</a>`;
  const pages = Array.from(
    { length: groupEnd - groupStart + 1 },
    (_, index) => groupStart + index,
  );
  return `<nav class="pagination" aria-label="검색 결과 페이지">${link(1, "&lt;&lt;")}${groupStart > 1 ? link(groupStart - 1, "&lt;") : '<span aria-disabled="true">&lt;</span>'}${pages.map((item) => link(item, item, item === page)).join("")}${groupEnd < last ? link(groupEnd + 1, "&gt;") : '<span aria-disabled="true">&gt;</span>'}${link(last, "&gt;&gt;")}</nav>`;
}
