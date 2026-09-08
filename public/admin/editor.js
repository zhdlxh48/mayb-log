(() => {
  const source = document.querySelector('[name="body_markdown"]');
  const preview = document.querySelector("#markdown-preview");
  const button = document.querySelector("#preview-button");
  if (!source || !preview || !button || !window.marked) return;

  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => escape(text);
  renderer.link = function ({ href, title, tokens }) {
    const safe = /^(https?:|mailto:|\/)/i.test(String(href || "").trim())
      ? href
      : "#";
    return `<a href="${escape(safe)}"${title ? ` title="${escape(title)}"` : ""}>${this.parser.parseInline(tokens)}</a>`;
  };
  renderer.image = ({ href, title, text }) => {
    const safe = /^(https?:|\/)/i.test(String(href || "").trim()) ? href : "#";
    return `<img src="${escape(safe)}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ""} loading="lazy">`;
  };
  marked.use({ gfm: true, renderer });
  button.addEventListener("click", () => {
    preview.innerHTML = marked.parse(source.value);
  });
})();
