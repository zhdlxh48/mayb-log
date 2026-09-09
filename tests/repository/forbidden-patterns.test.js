import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const name = path.join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === "vendor" ? [] : files(name);
        return /\.(?:js|ejs|css)$/.test(entry.name) ? [name] : [];
      }),
    )
  ).flat();
}

test("first-party runtime contains no retired CSRF cookie or inline handlers", async () => {
  for (const file of [
    ...(await files("src")),
    ...(await files("public")),
    ...(await files("views")),
  ]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /csrfCookie|document\.cookie|onsubmit=|data-delete-post|unsafe-inline/,
      file,
    );
  }
});

test("query files contain no SELECT star and one executable statement", async () => {
  for (const file of await files("src/db/queries")) assert.fail(`Unexpected non-SQL file: ${file}`);
  async function queries(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map((entry) => {
          const name = path.join(directory, entry.name);
          return entry.isDirectory() ? queries(name) : [name];
        }),
      )
    ).flat();
  }
  for (const file of await queries("src/db/queries")) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /SELECT\s+\*/i, file);
    assert.equal((source.match(/;/g) || []).length, 1, file);
  }
});
