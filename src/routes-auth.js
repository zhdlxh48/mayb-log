import {
  createSession,
  enforceAuthRate,
  passwordHash,
  PASSWORD_ITERATIONS,
  requireCsrf,
  requireUser,
  sessionCookie,
  sha256,
  verifyPassword,
  verifyTurnstile,
} from "./auth.js";
import { form, html, HttpError, redirect } from "./lib.js";
import { field, layout, message } from "./views.js";

const genericLoginError = "아이디, 비밀번호 또는 계정 상태를 확인해 주세요.";
const fakeUser = {
  password_salt: "AAAAAAAAAAAAAAAAAAAAAA==",
  password_hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  password_iterations: PASSWORD_ITERATIONS,
};

export async function authRoute(context) {
  const { request, env, url, session, nav } = context;
  if (url.pathname === "/signup")
    return request.method === "GET"
      ? authPage(context, "회원가입", signupForm(env))
      : signup(context);
  if (url.pathname === "/login")
    return request.method === "GET"
      ? authPage(context, "로그인", loginForm(env))
      : login(context);
  if (url.pathname === "/logout" && request.method === "POST") {
    requireUser(session);
    const data = await form(request);
    requireCsrf(request, data, session, env);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await sha256(session.raw))
      .run();
    return redirect("/", { "set-cookie": sessionCookie("", 0) });
  }
  if (url.pathname === "/account" && request.method === "GET") {
    requireUser(session);
    const body = `<dl><dt>아이디</dt><dd>${escape(session.username)}</dd><dt>표시 이름</dt><dd>${escape(session.display_name)}</dd><dt>역할</dt><dd>${escape(session.role)}</dd></dl><form action="/logout" method="post"><input type="hidden" name="csrf" value="${escape(session.csrf_token)}"><button type="submit">로그아웃</button></form>`;
    return html(
      layout(env, nav, session, {
        title: "Account",
        description: "내 계정 정보",
        canonical: "/account",
        noindex: true,
        body,
      }),
    );
  }
  return null;
}

function authPage({ env, nav, session }, title, body, status = 200) {
  return html(
    layout(env, nav, session, {
      title,
      description: title,
      canonical: `/${title === "로그인" ? "login" : "signup"}`,
      noindex: true,
      body,
    }),
    status,
  );
}

function turnstile(env, action) {
  return `<div class="cf-turnstile" data-sitekey="${escape(env.TURNSTILE_SITE_KEY)}" data-action="${action}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`;
}

function signupForm(env, error = "", values = {}) {
  return `${message(error)}<form class="auth-form" action="/signup" method="post"${error ? ' aria-describedby="form-error"' : ""}>${field("username", "아이디", values.username, { required: true, minlength: 3, maxlength: 32 })}${field("display_name", "표시 이름", values.display_name, { required: true, maxlength: 80 })}${field("password", "비밀번호 (12~128자)", "", { type: "password", required: true, minlength: 12, maxlength: 128 })}${field("password_confirmation", "비밀번호 확인", "", { type: "password", required: true, minlength: 12, maxlength: 128 })}${turnstile(env, "signup")}<button type="submit">가입 신청</button></form>`;
}

function loginForm(env, error = "") {
  return `${message(error)}<form class="auth-form" action="/login" method="post"${error ? ' aria-describedby="form-error"' : ""}>${field("username", "아이디", "", { required: true, maxlength: 32 })}${field("password", "비밀번호", "", { type: "password", required: true, maxlength: 128 })}${turnstile(env, "login")}<button type="submit">로그인</button></form>`;
}

async function signup(context) {
  const { request, env } = context;
  const data = await form(request);
  const username = String(data.get("username") || "")
    .trim()
    .toLowerCase();
  const displayName = String(data.get("display_name") || "").trim();
  const password = String(data.get("password") || "");
  const confirmation = String(data.get("password_confirmation") || "");
  await enforceAuthRate(request, env, username, "signup");
  await verifyTurnstile(request, env, data, "signup");
  let error = "";
  if (!/^[a-z0-9_-]{3,32}$/.test(username))
    error = "아이디는 영문 소문자, 숫자, _, -만 사용해 3~32자로 입력해 주세요.";
  else if (!displayName || displayName.length > 80)
    error = "표시 이름을 1~80자로 입력해 주세요.";
  else if (password.length < 12 || password.length > 128)
    error = "비밀번호를 12~128자로 입력해 주세요.";
  else if (password !== confirmation)
    error = "비밀번호 확인이 일치하지 않습니다.";
  if (error)
    return authPage(
      context,
      "회원가입",
      signupForm(env, error, { username, display_name: displayName }),
      400,
    );
  const exists = await env.DB.prepare("SELECT 1 FROM users WHERE username=?")
    .bind(username)
    .first();
  if (exists)
    return authPage(
      context,
      "회원가입",
      signupForm(env, "이미 사용 중인 아이디입니다.", {
        username,
        display_name: displayName,
      }),
      409,
    );
  const passwordData = await passwordHash(password);
  const now = Math.floor(Date.now() / 1000);
  try {
    await env.DB.prepare(
      `INSERT INTO users (username,display_name,password_hash,password_salt,password_iterations,role,status,created_at,updated_at) VALUES (?,?,?,?,?,'author','pending',?,?)`,
    )
      .bind(
        username,
        displayName,
        passwordData.hash,
        passwordData.salt,
        passwordData.iterations,
        now,
        now,
      )
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      return authPage(
        context,
        "회원가입",
        signupForm(env, "이미 사용 중인 아이디입니다.", {
          username,
          display_name: displayName,
        }),
        409,
      );
    throw error;
  }
  return authPage(
    context,
    "회원가입",
    `${message("가입 신청이 완료되었습니다. 관리자가 승인하면 로그인할 수 있습니다.", "success")}<p><a href="/login">로그인으로 이동</a></p>`,
    201,
  );
}

async function login(context) {
  const { request, env } = context;
  const data = await form(request);
  const username = String(data.get("username") || "")
    .trim()
    .toLowerCase();
  const password = String(data.get("password") || "");
  if (password.length > 128) throw new HttpError(400, genericLoginError);
  await enforceAuthRate(request, env, username, "login");
  await verifyTurnstile(request, env, data, "login");
  const user = await env.DB.prepare("SELECT * FROM users WHERE username=?")
    .bind(username)
    .first();
  const valid = await verifyPassword(password, user || fakeUser);
  if (!user || !valid || user.status !== "active")
    return authPage(context, "로그인", loginForm(env, genericLoginError), 401);
  if (user.password_iterations < PASSWORD_ITERATIONS) {
    const replacement = await passwordHash(password);
    await env.DB.prepare(
      "UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?",
    )
      .bind(
        replacement.hash,
        replacement.salt,
        replacement.iterations,
        Math.floor(Date.now() / 1000),
        user.id,
      )
      .run();
  }
  const created = await createSession(env, user.id);
  return redirect("/account", { "set-cookie": sessionCookie(created.raw) });
}

const escape = (value) =>
  String(value || "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
