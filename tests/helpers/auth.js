import assert from "node:assert/strict";
import { origin } from "./worker.js";

export const encodedPost = (path, values, cookie = "") =>
  fetch(`${origin}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(values),
  });

export async function login(username = "testuser", password = "test-password-1234") {
  const response = await encodedPost("/login", {
    username,
    password,
    "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  });
  assert.equal(response.status, 303);
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 1);
  assert.match(
    cookies[0],
    /session=.+; HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=604800/,
  );
  const cookie = cookies[0].split(";")[0];
  const profile = await fetch(`${origin}/profile`, { headers: { Cookie: cookie } });
  const html = await profile.text();
  const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
  assert.ok(csrf);
  return { cookie, csrf };
}
