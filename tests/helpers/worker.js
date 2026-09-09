import { spawn } from "node:child_process";

const port = 8791;
export const origin = `http://127.0.0.1:${port}`;

export async function withWorker(run) {
  const worker = spawn(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "dev",
      "--local",
      "--port",
      String(port),
      "--var",
      "TURNSTILE_SECRET_KEY:1x0000000000000000000000000000000AA",
      "--var",
      "TURNSTILE_SITE_KEY:1x00000000000000000000AA",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  worker.stdout.on("data", (chunk) => (output += chunk));
  worker.stderr.on("data", (chunk) => (output += chunk));
  try {
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        if ((await fetch(origin)).ok) return await run();
      } catch {
        // Worker is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Worker did not start:\n${output}`);
  } finally {
    worker.kill();
  }
}
