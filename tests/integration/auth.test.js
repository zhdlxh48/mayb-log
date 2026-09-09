import assert from "node:assert/strict";
import test from "node:test";
import { encodedPost, login } from "../helpers/auth.js";
import { resetDatabase, sql } from "../helpers/database.js";
import { origin, withWorker } from "../helpers/worker.js";

test("signup, login, CSRF, and stale sessions follow the single-cookie flow", () =>
  withWorker(async () => {
    resetDatabase();
    const mismatch = await encodedPost("/signup", {
      username: "integration_signup",
      display_name: "Signup",
      password: "signup-password-1234",
      password_confirmation: "different-password-1234",
      "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
    });
    assert.equal(mismatch.status, 400);
    const signup = await encodedPost("/signup", {
      username: "integration_signup",
      display_name: "Signup",
      password: "signup-password-1234",
      password_confirmation: "signup-password-1234",
      "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
    });
    assert.equal(signup.status, 303);
    assert.deepEqual(
      sql("SELECT status, password_iterations FROM users WHERE username = 'integration_signup'")[0],
      { status: "pending", password_iterations: 100_000 },
    );
    assert.equal(
      (
        await encodedPost("/login", {
          username: "integration_missing",
          password: "wrong-password-1234",
          "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
        })
      ).status,
      401,
    );

    const auth = await login();
    const profile = await (
      await fetch(`${origin}/profile`, { headers: { Cookie: auth.cookie } })
    ).text();
    assert.match(profile, /type="hidden" name="csrf" value="[^"]+"/);
    assert.equal(
      (await encodedPost("/profile/update", { csrf: "wrong", display_name: "No" }, auth.cookie))
        .status,
      403,
    );
    assert.equal(
      (
        await fetch(`${origin}/profile/update`, {
          method: "POST",
          redirect: "manual",
          headers: {
            Origin: "https://evil.example",
            Cookie: auth.cookie,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ csrf: auth.csrf, display_name: "No" }),
        })
      ).status,
      403,
    );
    const stale = await fetch(`${origin}/profile`, {
      redirect: "manual",
      headers: { Cookie: "session=missing" },
    });
    assert.equal(stale.status, 401);
    assert.match(stale.headers.get("set-cookie"), /session=;.*Max-Age=0/);
    assert.equal((await encodedPost("/logout", { csrf: auth.csrf }, auth.cookie)).status, 303);
  }));
