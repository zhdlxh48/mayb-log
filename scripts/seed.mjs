import { spawnSync } from "node:child_process";

const run = (args) => {
  const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
};

run(["d1", "execute", "mayb-log-final", "--local", "--file", "seed/development.sql"]);
run([
  "r2",
  "object",
  "put",
  "mayb-log-media-final/posts/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
  "--local",
  "--file",
  "seed/sample.webp",
  "--content-type",
  "image/webp",
]);
