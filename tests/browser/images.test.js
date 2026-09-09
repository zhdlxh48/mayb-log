import { expect, test } from "@playwright/test";

test("vendored image compression produces WebP within 1600px", async ({ page }) => {
  await page.goto("/");
  await page.addScriptTag({ url: "/vendor/browser-image-compression.js" });
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext("2d");
    context.fillStyle = "#3b6ea8";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
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
  expect(result.type).toBe("image/webp");
  expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1600);
  expect(result.compressedBytes).toBeLessThan(result.originalBytes);
});
