document.addEventListener("submit", (event) => {
  const message = event.target.dataset.confirm;
  if (message && !confirm(message)) event.preventDefault();
});
