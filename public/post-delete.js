(() => {
  const readCookie = (name) => document.cookie.split(";").map((part) => part.trim().split(/=(.*)/s)).find(([key]) => key === name)?.[1] || "";
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-post]");
    if (!button || !confirm("이 게시글을 삭제하시겠습니까?")) return;
    const body = new URLSearchParams({ csrf: readCookie("csrf") });
    const response = await fetch(`/posts/${button.dataset.deletePost}/delete`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (response.redirected) location.href = response.url;
    else if (!response.ok) alert((await response.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  });
})();
