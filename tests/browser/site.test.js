import { test, expect } from "@playwright/test";

test("semantic public navigation, popover and no-script search fallback work", async ({
  page,
}) => {
  await page.goto("/posts");
  await expect(
    page.locator('header nav[aria-label="주요 메뉴"]'),
  ).toBeVisible();
  await expect(page.locator("main h1")).toHaveText("Posts");
  await page.getByRole("button", { name: "Categories 빠른 메뉴" }).click();
  await expect(page.locator("#categories-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#categories-menu")).toBeHidden();
  await page.goto("/search");
  await page.getByLabel("검색어").fill("Markdown");
  await page.getByLabel("Posts").check();
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page).toHaveURL(/q=Markdown&type=posts/);
  await expect(page.locator("#search-results")).toContainText(
    "Markdown으로 읽기 좋은 글 쓰기",
  );
});

test("responsive layouts have no horizontal overflow and keep logical order without CSS", async ({
  page,
}) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/posts/first-note");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `${width}px`).toBeLessThanOrEqual(1);
  }
  await page.evaluate(() =>
    document
      .querySelectorAll('link[rel="stylesheet"]')
      .forEach((link) => link.remove()),
  );
  const landmarks = await page
    .locator("body > header, body > main, body > footer")
    .evaluateAll((nodes) => nodes.map((node) => node.tagName));
  expect(landmarks).toEqual(["HEADER", "MAIN", "FOOTER"]);
});

test("vendored image compression produces WebP within 1600px", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.addScriptTag({ url: "/vendor/browser-image-compression.js" });
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext("2d");
    context.fillStyle = "#3b6ea8";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    const original = new File([blob], "sample.png", { type: "image/png" });
    const compressed = await imageCompression(original, {
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.82,
      libURL: "/vendor/browser-image-compression.js",
    });
    const bitmap = await createImageBitmap(compressed);
    return {
      originalBytes: original.size,
      compressedBytes: compressed.size,
      width: bitmap.width,
      height: bitmap.height,
      type: compressed.type,
    };
  });
  console.log(
    `compression sample ${testInfo.project.name}: ${result.originalBytes} B -> ${result.compressedBytes} B, ${result.width}x${result.height}, ${result.type}`,
  );
  testInfo.annotations.push({
    type: "compression",
    description: JSON.stringify(result),
  });
  expect(result.type).toBe("image/webp");
  expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1600);
  expect(result.compressedBytes).toBeLessThan(result.originalBytes);
});
