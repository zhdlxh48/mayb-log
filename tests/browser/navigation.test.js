import { expect, test } from "@playwright/test";

test("public navigation and native archive details stay usable", async ({ page }) => {
  await page.goto("/posts");
  const links = await page.locator('header nav[aria-label="주요 메뉴"] a').allTextContents();
  expect(links.map((value) => value.trim())).toEqual([
    "mayb-log",
    "Posts",
    "Series",
    "Categories",
    "Archive",
    "Search",
    "Login",
  ]);
  await expect(page.getByRole("link", { name: "New Post" })).toBeVisible();
  await page.goto("/archive");
  await page.locator("details summary").first().click();
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
});
