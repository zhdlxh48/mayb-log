import { cookies } from "../lib.js";
import { findActiveSession } from "../db/sessions.js";
import { sessionCookie } from "../services/security.js";

export async function loadSession(req, res, next) {
  try {
    const token = cookies(req.headers.cookie).session;
    req.user = await findActiveSession(req.app.locals.bindings().DB, token);
    if (token && !req.user) res.set("Set-Cookie", sessionCookie("", 0));
    next();
  } catch (error) {
    next(error);
  }
}
