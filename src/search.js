import { dateEpoch, positiveIds, requestedPage, uniqueText } from "./lib.js";

export const escapeLike = (value) => String(value).replace(/[\\%_]/g, "\\$&");
export const ftsPhrase = (value) => `"${String(value).replaceAll('"', '""')}"`;

export function parseSearch(query) {
  const q = String(query.q || "").trim();
  const to = String(query.to || "");
  return {
    q,
    series: positiveIds(query.series),
    categories: positiveIds(query.category),
    tags: uniqueText(query.tag),
    from: String(query.from || ""),
    to,
    fromEpoch: dateEpoch(query.from),
    toEpoch: to ? dateEpoch(to) + 24 * 60 * 60 : null,
    page: requestedPage(query.page),
  };
}

export function searchParams(filters, page) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const id of filters.series) params.append("series", id);
  for (const id of filters.categories) params.append("category", id);
  for (const tag of filters.tags) params.append("tag", tag);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page > 1) params.set("page", page);
  return params;
}
