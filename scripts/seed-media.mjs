import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv.includes("--remote") ? "--remote" : "--local";
const root = fileURLToPath(new URL("../seed/media/", import.meta.url));
const types = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? files(join(directory, entry.name))
        : [join(directory, entry.name)],
    ),
  );
  return nested.flat();
}

for (const file of await files(root)) {
  const key = `media/legacy/${relative(root, file).replaceAll("\\", "/")}`;
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "r2",
      "object",
      "put",
      `mayb-log-media/${key}`,
      mode,
      "--file",
      file,
      "--content-type",
      types[extname(file).toLowerCase()],
    ],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status || 1);
}
