import { marked } from "marked";

const escape = (value) => String(value ?? "").replace(/[&<>'\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const safeUrl = (value) => /^(https?:|mailto:|\/)/i.test(String(value || "").trim()) ? String(value).trim() : "#";

const renderer = new marked.Renderer();
renderer.html = ({ text }) => escape(text);
renderer.link = function ({ href, title, tokens }) {
  return `<a href="${escape(safeUrl(href))}"${title ? ` title="${escape(title)}"` : ""}>${this.parser.parseInline(tokens)}</a>`;
};
renderer.image = ({ href, title, text }) => `<img src="${escape(safeUrl(href))}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ""} loading="lazy">`;

marked.use({ gfm: true, breaks: false, renderer });

export function renderMarkdown(bodyMarkdown) {
  const markdown = String(bodyMarkdown || "");
  const bodyHtml = marked.parse(markdown);
  const plainBody = bodyHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { bodyHtml, plainBody };
}
