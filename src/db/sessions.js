import { SESSION_SECONDS } from "../lib.js";
import { randomToken, sha256 } from "../services/security.js";

export async function findActiveSession(db, rawToken) {
  if (!rawToken) return null;
  const tokenHash = await sha256(rawToken);
  const now = Math.floor(Date.now() / 1000);
  const user = await db.prepare(`
    SELECT s.token_hash, s.csrf_token, s.expires_at,
           u.id, u.username, u.display_name
    FROM sessions AS s
    JOIN users AS u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'
  `).bind(tokenHash, now).first();
  return user ? { ...user, rawToken } : null;
}

export async function createSession(db, userId) {
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const csrfToken = randomToken();
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`
    INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(tokenHash, userId, csrfToken, now, now + SESSION_SECONDS).run();
  return { rawToken, csrfToken };
}

export async function deleteSession(db, rawToken) {
  if (rawToken) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(rawToken)).run();
}
