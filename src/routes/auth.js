import { Router } from "express";
import { HttpError } from "../lib.js";
import { createSession } from "../db/sessions.js";
import { createUser, findUserByUsername } from "../db/users.js";
import { csrfCookie, passwordHash, sessionCookie, verifyPassword } from "../services/security.js";
import { verifyTurnstile } from "../services/turnstile.js";
import { requireOrigin } from "../middleware/csrf.js";

export const authRoutes = Router();
const scripts = ["https://challenges.cloudflare.com/turnstile/v0/api.js"];

function fields(req) {
  return {
    username: String(req.body.username || "").trim().toLowerCase(),
    displayName: String(req.body.display_name || "").trim(),
    password: String(req.body.password || ""),
  };
}

async function rateLimit(req, key) {
  const result = await req.app.locals.bindings().AUTH_RATE_LIMIT?.limit({ key: `${req.ip}:${key}` });
  if (result && !result.success) throw new HttpError(429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
}

authRoutes.get("/login", (req, res) => res.renderPage("login", { title: "Login", message: String(req.query.message || ""), noindex: true, scripts }));
authRoutes.post("/login", requireOrigin, async (req, res) => {
  const input = fields(req);
  await rateLimit(req, `login:${input.username}`);
  await verifyTurnstile(req.app.locals.bindings(), req.body["cf-turnstile-response"], "login", req.ip);
  const user = await findUserByUsername(req.app.locals.bindings().DB, input.username);
  if (!user || user.status !== "active" || !(await verifyPassword(input.password, user)))
    throw new HttpError(401, "아이디, 비밀번호 또는 계정 상태를 확인해 주세요.");
  const session = await createSession(req.app.locals.bindings().DB, user.id);
  res.append("Set-Cookie", [sessionCookie(session.rawToken), csrfCookie(session.csrfToken)]);
  res.redirect(303, "/profile");
});

authRoutes.get("/signup", (req, res) => res.renderPage("signup", { title: "Sign up", message: String(req.query.message || ""), noindex: true, scripts }));
authRoutes.post("/signup", requireOrigin, async (req, res) => {
  const input = fields(req);
  await rateLimit(req, `signup:${input.username}`);
  await verifyTurnstile(req.app.locals.bindings(), req.body["cf-turnstile-response"], "signup", req.ip);
  if (!/^[a-z0-9_]{3,32}$/.test(input.username)) throw new HttpError(400, "아이디는 영문 소문자, 숫자, 밑줄 3~32자로 입력해 주세요.");
  if (!input.displayName || input.displayName.length > 80) throw new HttpError(400, "닉네임을 입력해 주세요.");
  if (input.password.length < 12 || input.password.length > 200) throw new HttpError(400, "비밀번호는 12자 이상 입력해 주세요.");
  const password = await passwordHash(input.password);
  const now = Math.floor(Date.now() / 1000);
  await createUser(req.app.locals.bindings().DB, { ...input, ...password, now });
  res.redirect(303, "/login?message=가입이+완료되었습니다.+관리자가+D1에서+계정을+활성화한+후+로그인할+수+있습니다.");
});
