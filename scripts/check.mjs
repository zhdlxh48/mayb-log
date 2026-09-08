import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const required = [
  "src/index.js",
  "migrations/0001_initial.sql",
  "migrations/0002_sample_content.sql",
  "public/site.css",
  "public/vendor/htmx.min.js",
  "public/vendor/prism.js",
  "public/vendor/marked.js",
  "public/vendor/browser-image-compression.js",
];
for (const file of required) await readFile(file);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const forbidden = [
  "astro",
  "tailwind",
  "flexsearch",
  "sharp",
  "react",
  "vue",
  "svelte",
  "express",
  "jsonwebtoken",
];
const packages = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
})
  .join(" ")
  .toLowerCase();
for (const name of forbidden)
  if (packages.includes(name))
    throw new Error(`Forbidden dependency remains: ${name}`);

const sourceFiles = (await readdir("src", { recursive: true })).filter((file) =>
  file.endsWith(".js"),
);
for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ["--check", `src/${file}`], {
    stdio: "inherit",
  });
  if (result.status) process.exit(result.status || 1);
}
console.log(
  `Checked ${required.length} required artifacts and ${sourceFiles.length} source files.`,
);
