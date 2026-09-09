import { SESSION_SECONDS } from "../lib.js";
import { randomToken, sha256 } from "../services/security.js";
import deleteQuery from "./queries/sessions/delete.sql";
import findActive from "./queries/sessions/find-active.sql";
import insertQuery from "./queries/sessions/insert.sql";

export async function findActiveSession(db, rawToken) {
  if (!rawToken) return null;
  const user = await db
    .prepare(findActive)
    .bind(await sha256(rawToken), Math.floor(Date.now() / 1000))
    .first();
  return user ? { ...user, rawToken } : null;
}

export async function createSession(db, userId) {
  const rawToken = randomToken();
  const csrfToken = randomToken();
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(insertQuery)
    .bind(await sha256(rawToken), userId, csrfToken, now, now + SESSION_SECONDS)
    .run();
  return { rawToken, csrfToken };
}

export async function deleteSession(db, rawToken) {
  if (rawToken)
    await db
      .prepare(deleteQuery)
      .bind(await sha256(rawToken))
      .run();
}
