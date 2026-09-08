import { marked } from "./vendor/marked.esm.js";
import { escapeHtml, normalizeText } from "./lib.js";

const safeUrl = (value) => {
  const url = String(value || "").trim();
  return /^(https?:|mailto:|\/)/i.test(url) ? url : "#";
};

const renderer = new marked.Renderer();
renderer.html = ({ text }) => escapeHtml(text);
renderer.link = function ({ href, title, tokens }) {
  return `<a href="${escapeHtml(safeUrl(href))}"${title ? ` title="${escapeHtml(title)}"` : ""}>${this.parser.parseInline(tokens)}</a>`;
};
renderer.image = ({ href, title, text }) =>
  `<img src="${escapeHtml(safeUrl(href))}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ""} loading="lazy">`;

marked.use({ gfm: true, breaks: false, renderer });

export function renderMarkdown(markdown) {
  const bodyMarkdown = String(markdown || "");
  const bodyHtml = marked.parse(bodyMarkdown);
  const bodyText = normalizeText(
    bodyHtml.replace(/<[^>]+>/g, " ").replace(/&(?:amp|lt|gt|quot|#39);/g, " "),
  ).replace(/\s+/g, " ");
  return { bodyMarkdown, bodyHtml, bodyText };
}

export function buildSearchText(fields) {
  return normalizeText(
    [
      fields.title,
      fields.subtitle,
      fields.description,
      fields.bodyText,
      fields.displayName,
      fields.seriesTitle,
      ...(fields.categories || []),
      ...(fields.tags || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}
