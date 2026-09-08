import { SESSION_SECONDS } from "../lib.js";

export const PASSWORD_ITERATIONS = 100_000;
const encoder = new TextEncoder();
const base64 = (bytes) => btoa(String.fromCharCode(...bytes));
const bytes = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

export function randomToken(size = 32) {
  return base64(crypto.getRandomValues(new Uint8Array(size))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function sha256(value) {
  return base64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

export async function passwordHash(password, salt = crypto.getRandomValues(new Uint8Array(16)), iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return { hash: base64(new Uint8Array(hash)), salt: base64(salt), iterations };
}

export async function verifyPassword(password, user) {
  const candidate = bytes((await passwordHash(password, bytes(user.password_salt), user.password_iterations)).hash);
  const expected = bytes(user.password_hash);
  let difference = candidate.length ^ expected.length;
  for (let index = 0; index < Math.max(candidate.length, expected.length); index++)
    difference |= (candidate[index] || 0) ^ (expected[index] || 0);
  return difference === 0;
}

export const sessionCookie = (token, maxAge = SESSION_SECONDS) => `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
export const csrfCookie = (token, maxAge = SESSION_SECONDS) => `csrf=${token}; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
