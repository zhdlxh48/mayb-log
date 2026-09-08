import { HttpError, SESSION_SECONDS } from "./lib.js";

export const PASSWORD_ITERATIONS = 600_000;
const encoder = new TextEncoder();
const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (text) =>
  Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

export function randomToken(bytes = 32) {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function sha256(value) {
  return bytesToBase64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
}

export async function passwordHash(
  password,
  salt = crypto.getRandomValues(new Uint8Array(16)),
  iterations = PASSWORD_ITERATIONS,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return {
    hash: bytesToBase64(new Uint8Array(hash)),
    salt: bytesToBase64(salt),
    iterations,
  };
}

export async function verifyPassword(password, user) {
  const candidate = await passwordHash(
    password,
    base64ToBytes(user.password_salt),
    user.password_iterations,
  );
  const left = base64ToBytes(candidate.hash);
  const right = base64ToBytes(user.password_hash);
  let difference = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++)
    difference |= (left[i] || 0) ^ (right[i] || 0);
  return difference === 0;
}

function cookieValue(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

export async function currentSession(request, env) {
  const raw = cookieValue(request, "session");
  if (!raw) return null;
  const hash = await sha256(raw);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `SELECT s.token_hash, s.csrf_token, s.expires_at,
      u.id, u.username, u.display_name, u.role, u.status
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`,
  )
    .bind(hash)
    .first();
  if (!row || row.expires_at <= now || row.status !== "active") {
    if (row)
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(hash)
        .run();
    return null;
  }
  return { ...row, raw };
}

export async function createSession(env, userId) {
  const raw = randomToken();
  const tokenHash = await sha256(raw);
  const csrf = randomToken();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(tokenHash, userId, csrf, now, now + SESSION_SECONDS)
    .run();
  return { raw, csrf };
}

export function sessionCookie(raw, maxAge = SESSION_SECONDS) {
  return `session=${raw}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function requireUser(session, role) {
  if (!session) throw new HttpError(401, "로그인이 필요합니다.");
  if (role && session.role !== role)
    throw new HttpError(403, "권한이 없습니다.");
  return session;
}

export function requireCsrf(request, data, session, env) {
  const requestOrigin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const expected = ["localhost", "127.0.0.1"].includes(requestUrl.hostname)
    ? requestUrl.origin
    : new URL(env.SITE_ORIGIN).origin;
  if (
    !requestOrigin ||
    requestOrigin !== expected ||
    !session ||
    data.get("csrf") !== session.csrf_token
  )
    throw new HttpError(403, "요청을 확인할 수 없습니다. 다시 시도해 주세요.");
}

export async function verifyTurnstile(request, env, data, action) {
  const token = String(data.get("cf-turnstile-response") || "");
  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET_KEY || "");
  body.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.set("remoteip", ip);
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  const result = await response.json();
  const localTestKey = env.TURNSTILE_SITE_KEY === "1x00000000000000000000AA";
  if (
    !result.success ||
    (!localTestKey &&
      (result.hostname !== new URL(env.SITE_ORIGIN).hostname ||
        result.action !== action))
  )
    throw new HttpError(
      400,
      "사람인지 확인하지 못했습니다. 다시 시도해 주세요.",
    );
}

export async function enforceAuthRate(request, env, username, routeName) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const outcome = await env.AUTH_RATE_LIMIT?.limit({
    key: `${routeName}:${username || ip}`,
  });
  if (outcome && !outcome.success)
    throw new HttpError(
      429,
      "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    );
}
