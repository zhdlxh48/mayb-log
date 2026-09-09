import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character],
  );

const iframe = /^\s*<iframe\b[\s\S]*<\/iframe\s*>\s*$/i;
const renderer = new marked.Renderer();
renderer.html = ({ text }) => {
  if (!iframe.test(text)) return escape(text);
  return sanitizeHtml(text, {
    allowedTags: ["iframe"],
    allowedAttributes: {
      iframe: [
        "src",
        "title",
        "width",
        "height",
        "loading",
        "allow",
        "allowfullscreen",
        "referrerpolicy",
        "sandbox",
      ],
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { iframe: ["http", "https"] },
  });
};

marked.use({ gfm: true, breaks: false, renderer });

export function renderMarkdown(bodyMarkdown) {
  const bodyHtml = marked.parse(String(bodyMarkdown || ""));
  const plainBody = bodyHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { bodyHtml, plainBody };
}
