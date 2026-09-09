import { expect, test } from "@playwright/test";

test("pagination remains visible with disabled controls on a one-page result", async ({ page }) => {
  for (const path of ["/posts", "/search?q=Worker"]) {
    await page.goto(path);
    const pager = page.getByRole("navigation", { name: "페이지" });
    await expect(pager).toBeVisible();
    await expect(pager).toContainText("<< < 1 > >>");
    await expect(pager.locator('[aria-disabled="true"]')).toHaveCount(4);
    await expect(pager.locator('[aria-current="page"]')).toHaveText("1");
  }
});
