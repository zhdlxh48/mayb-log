(() => {
  const source = document.querySelector('[name="body_markdown"]');
  const preview = document.querySelector("#markdown-preview");
  const button = document.querySelector("#preview-button");
  if (!source || !preview || !button || !window.marked) return;
  marked.use({ gfm: true, breaks: false });
  button.addEventListener("click", () => {
    preview.innerHTML = marked.parse(source.value);
    window.Prism?.highlightAllUnder(preview);
  });
})();
