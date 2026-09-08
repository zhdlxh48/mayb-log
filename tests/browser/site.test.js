import { test, expect } from "@playwright/test";

test("public navigation and search stay semantic with or without enhancement", async ({ page }) => {
  await page.goto("/posts");
  const links = await page.locator('header nav[aria-label="주요 메뉴"] a').allTextContents();
  expect(links.map((value) => value.trim())).toEqual(["mayb-log", "Posts", "Series", "Categories", "Archive", "Search", "Login"]);
  await expect(page.getByRole("link", { name: "New Post" })).toBeVisible();
  await page.goto("/search");
  await page.getByLabel("Text").fill("Worker");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=Worker/);
  await expect(page.locator("#search-results")).toContainText("Express와 EJS로 다시 만든 블로그");

  await page.context().addCookies([{ name: "session", value: "fake", url: "http://127.0.0.1:8792" }]);
  await page.goto("/archive");
  await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  await page.locator("details summary").first().click();
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
});

test("responsive pages do not overflow and remain ordered without CSS", async ({ page }) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/posts/1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px`).toBeLessThanOrEqual(1);
  }
  await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove()));
  expect(await page.locator("body > header, body > main, body > footer").evaluateAll((nodes) => nodes.map((node) => node.tagName))).toEqual(["HEADER", "MAIN", "FOOTER"]);
});

test("EJS escapes user-controlled messages", async ({ page }) => {
  await page.goto("/login?message=%3Cscript%3Ewindow.pwned%3D1%3C%2Fscript%3E");
  await expect(page.locator("main")).toContainText("<script>window.pwned=1</script>");
  await expect(page.locator("main script")).toHaveCount(0);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
});

test("authenticated editor keeps new images local and inserts Markdown", async ({ page }) => {
  await page.context().clearCookies();
  const response = await page.request.post("/login", {
    headers: { Origin: "http://127.0.0.1:8792" },
    form: { username: "testuser", password: "test-password-1234", "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  const setCookies = response.headersArray().filter(({ name }) => name.toLowerCase() === "set-cookie").map(({ value }) => value);
  const value = (name) => setCookies.find((cookie) => cookie.startsWith(`${name}=`)).match(new RegExp(`^${name}=([^;]+)`))[1];
  await page.context().addCookies([
    { name: "session", value: value("session"), url: "http://127.0.0.1:8792", sameSite: "Strict" },
    { name: "csrf", value: value("csrf"), url: "http://127.0.0.1:8792", sameSite: "Strict" },
  ]);
  await page.goto("/posts/new");
  await page.locator("#image-files").setInputFiles("seed/sample.png");
  await expect(page.locator("#pending-images .image-item")).toHaveCount(1);
  await page.locator("#pending-images input").fill("대체 텍스트");
  await page.getByRole("button", { name: "Insert" }).click();
  await expect(page.locator("#body_markdown")).toHaveValue(/!\[대체 텍스트\]\(\/media\/posts\/.+\.webp\)/);
});

test("vendored image compression produces WebP within 1600px", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.addScriptTag({ url: "/vendor/browser-image-compression.js" });
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 2400; canvas.height = 1800;
    const context = canvas.getContext("2d"); context.fillStyle = "#3b6ea8"; context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const original = new File([blob], "sample.png", { type: "image/png" });
    const compressed = await imageCompression(original, { maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/webp", initialQuality: .82, libURL: "/vendor/browser-image-compression.js" });
    const bitmap = await createImageBitmap(compressed);
    return { originalBytes: original.size, compressedBytes: compressed.size, width: bitmap.width, height: bitmap.height, type: compressed.type };
  });
  console.log(`compression ${testInfo.project.name}: ${result.originalBytes} -> ${result.compressedBytes} B, ${result.width}x${result.height}`);
  expect(result.type).toBe("image/webp");
  expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1600);
  expect(result.compressedBytes).toBeLessThan(result.originalBytes);
});
