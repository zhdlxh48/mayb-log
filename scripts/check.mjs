import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const required = [
  "src/app.js", "src/worker.js", "src/db/posts.js", "src/db/search.js",
  "migrations/0001_initial.sql", "public/site.css", "public/vendor/htmx.min.js",
  "public/vendor/prism.js", "public/vendor/marked.js", "public/vendor/browser-image-compression.js",
  "views/about.ejs", "views/posts.ejs", "views/post.ejs", "views/search.ejs",
  "views/login.ejs", "views/signup.ejs", "views/profile.ejs",
];
for (const file of required) await readFile(file);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packages = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
for (const forbidden of ["astro", "tailwindcss", "jsonwebtoken", "react", "vue", "svelte"])
  if (packages.some((name) => name.toLowerCase().includes(forbidden))) throw new Error(`Forbidden dependency remains: ${forbidden}`);

const sourceFiles = (await readdir("src", { recursive: true })).filter((file) => file.endsWith(".js"));
for (const file of sourceFiles) {
  const source = await readFile(`src/${file}`, "utf8");
  for (const pattern of [/SELECT\s+\*/i, /SELECT\s+[pc]\.\*/i, /["']\/admin(?:\/|["'])/])
    if (pattern.test(source)) throw new Error(`Forbidden source pattern ${pattern} in src/${file}`);
  const result = spawnSync(process.execPath, ["--check", `src/${file}`], { stdio: "inherit" });
  if (result.status) process.exit(result.status || 1);
}
const schema = await readFile("migrations/0001_initial.sql", "utf8");
for (const removed of [" role ", "CREATE TABLE pages", "CREATE TABLE tags", "CREATE TABLE post_images", " slug "])
  if (schema.toLowerCase().includes(removed.toLowerCase())) throw new Error(`Removed schema remains: ${removed.trim()}`);
console.log(`Checked ${required.length} required artifacts and ${sourceFiles.length} source files.`);
