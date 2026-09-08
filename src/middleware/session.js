import { cookies } from "../lib.js";
import { findActiveSession } from "../db/sessions.js";

export async function loadSession(req, res, next) {
  try {
    const token = cookies(req.headers.cookie).session;
    req.user = await findActiveSession(req.app.locals.bindings().DB, token);
    next();
  } catch (error) { next(error); }
}
