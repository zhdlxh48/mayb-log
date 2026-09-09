export default {
  "*.js": ["prettier --write", "eslint --fix"],
  "*.{ejs,css,json,jsonc,md,yml,yaml}": "prettier --write",
  "*.sql": (files) =>
    files.map((file) => `sql-formatter --fix --config .sql-formatter.json "${file}"`),
};
