import { expect, test } from "@playwright/test";

test("signup toggles both password fields and messages remain escaped", async ({ page }) => {
  await page.goto("/signup");
  const passwords = page.locator('[autocomplete="new-password"]');
  await expect(passwords).toHaveCount(2);
  await page.getByLabel("비밀번호 표시").check();
  await expect(passwords.nth(0)).toHaveAttribute("type", "text");
  await expect(passwords.nth(1)).toHaveAttribute("type", "text");
  await page.getByLabel("비밀번호 표시").uncheck();
  await expect(passwords.nth(0)).toHaveAttribute("type", "password");
  await expect(passwords.nth(1)).toHaveAttribute("type", "password");

  await page.goto("/login?message=%3Cscript%3Ewindow.pwned%3D1%3C%2Fscript%3E");
  await expect(page.locator("main")).toContainText("<script>window.pwned=1</script>");
  await expect(page.locator("main script")).toHaveCount(0);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
});
