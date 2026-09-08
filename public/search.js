(() => {
  const status = document.querySelector("#search-status");
  if (!status) return;
  document.body.addEventListener("htmx:beforeRequest", () => { status.textContent = "검색 중…"; });
  document.body.addEventListener("htmx:afterSwap", () => { status.textContent = ""; });
  document.body.addEventListener("htmx:responseError", () => { status.textContent = "검색하지 못했습니다. 다시 시도해 주세요."; });
})();
