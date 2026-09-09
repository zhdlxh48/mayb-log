import assert from "node:assert/strict";
import test from "node:test";
import {
  FAKE_PASSWORD_RECORD,
  PASSWORD_ITERATIONS,
  passwordHash,
  sessionCookie,
  verifyPassword,
} from "../../src/services/security.js";

test("sessions and PBKDF2 use the final security policy", async () => {
  assert.equal(PASSWORD_ITERATIONS, 100_000);
  assert.match(sessionCookie("raw"), /HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=604800/);
  const stored = await passwordHash("correct-horse-battery");
  assert.equal(
    await verifyPassword("correct-horse-battery", {
      password_hash: stored.hash,
      password_salt: stored.salt,
      password_iterations: stored.iterations,
    }),
    true,
  );
  assert.equal(await verifyPassword("missing", FAKE_PASSWORD_RECORD), false);
});
