import { expect, test } from "@playwright/test";

async function login(page) {
  const response = await page.request.post("/login", {
    headers: { Origin: "http://127.0.0.1:8792" },
    form: {
      username: "testuser",
      password: "test-password-1234",
      "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  const cookie = response
    .headersArray()
    .find(({ name }) => name.toLowerCase() === "set-cookie").value;
  const session = cookie.match(/^session=([^;]+)/)[1];
  await page
    .context()
    .addCookies([
      { name: "session", value: session, url: "http://127.0.0.1:8792", sameSite: "Strict" },
    ]);
}

test("editor preview is intentionally raw and server delete stays in the edit form", async ({
  page,
}) => {
  await login(page);
  await page.goto("/posts/1/edit");
  await page.locator("#body_markdown").fill("<div id=preview-raw>Test</div>");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator("#markdown-preview #preview-raw")).toHaveText("Test");
  await expect(page.locator('form[action="/posts/1/delete"] input[name="csrf"]')).toHaveCount(1);
});
