import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { format } from "sql-formatter";

async function sqlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const name = path.join(directory, entry.name);
      return entry.isDirectory() ? sqlFiles(name) : entry.name.endsWith(".sql") ? [name] : [];
    }),
  );
  return nested.flat();
}

test("first-party SQL matches the shared formatter configuration", async () => {
  const options = JSON.parse(await readFile(".sql-formatter.json", "utf8"));
  for (const file of [
    ...(await sqlFiles("src")),
    ...(await sqlFiles("migrations")),
    ...(await sqlFiles("seed")),
  ]) {
    const source = await readFile(file, "utf8");
    assert.equal(source, format(source, options), file);
  }
});
