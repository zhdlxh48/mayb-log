document.querySelector("#show-password")?.addEventListener("change", (event) => {
  for (const input of document.querySelectorAll('[autocomplete="new-password"]')) {
    input.type = event.target.checked ? "text" : "password";
  }
});
