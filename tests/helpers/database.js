import { spawnSync } from "node:child_process";

const wrangler = "node_modules/wrangler/bin/wrangler.js";

export function command(...args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { encoding: "utf8" });
  if (result.status) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}

export function sql(statement) {
  return JSON.parse(
    command("d1", "execute", "mayb-log-final", "--local", "--json", "--command", statement),
  )[0].results;
}

export function resetDatabase() {
  sql(
    "DELETE FROM sessions; DELETE FROM post_categories WHERE post_id > 2; DELETE FROM post_fts WHERE rowid > 2; DELETE FROM posts WHERE id > 2; DELETE FROM users WHERE username LIKE 'integration_%'; DELETE FROM series WHERE title LIKE 'Integration %'; DELETE FROM categories WHERE name LIKE 'Integration %'; UPDATE users SET display_name = 'MayB' WHERE username = 'testuser'",
  );
}
