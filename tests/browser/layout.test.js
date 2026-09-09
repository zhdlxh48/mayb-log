import { expect, test } from "@playwright/test";

test("key pages do not overflow at supported widths and retain semantic order", async ({
  page,
}) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/posts",
      "/posts/1",
      "/series",
      "/categories",
      "/search",
      "/archive",
      "/login",
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        `${path} at ${width}px`,
      ).toBeLessThanOrEqual(1);
    }
  }
  await page.goto("/posts/1");
  await page.evaluate(() =>
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove()),
  );
  expect(
    await page
      .locator("body > header, body > main, body > footer")
      .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
  ).toEqual(["HEADER", "MAIN", "FOOTER"]);
});
