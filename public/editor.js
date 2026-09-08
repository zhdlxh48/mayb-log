(() => {
  const source = document.querySelector('[name="body_markdown"]');
  const preview = document.querySelector("#markdown-preview");
  const button = document.querySelector("#preview-button");
  if (!source || !preview || !button || !window.marked) return;
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const safeUrl = (value) => /^(https?:|mailto:|\/)/i.test(String(value || "").trim()) ? value : "#";
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => escape(text);
  renderer.link = function ({ href, title, tokens }) { return `<a href="${escape(safeUrl(href))}"${title ? ` title="${escape(title)}"` : ""}>${this.parser.parseInline(tokens)}</a>`; };
  renderer.image = ({ href, title, text }) => `<img src="${escape(safeUrl(href))}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ""} loading="lazy">`;
  marked.use({ gfm: true, breaks: false, renderer });
  button.addEventListener("click", () => { preview.innerHTML = marked.parse(source.value); window.Prism?.highlightAllUnder(preview); });
})();
