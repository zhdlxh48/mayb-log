import { Router } from "express";
import { cookies, HttpError } from "../lib.js";
import { deleteSession } from "../db/sessions.js";
import { updateDisplayName } from "../db/users.js";
import { loadSession } from "../middleware/session.js";
import { requireActive } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";
import { csrfCookie, sessionCookie } from "../services/security.js";

export const profileRoutes = Router();
profileRoutes.get("/profile", loadSession, requireActive, (req, res) => res.renderPage("profile", { title: "Profile", user: req.user, noindex: true }));
profileRoutes.post("/profile/update", loadSession, requireActive, requireCsrf, async (req, res) => {
  const displayName = String(req.body.display_name || "").trim();
  if (!displayName || displayName.length > 80) throw new HttpError(400, "닉네임을 입력해 주세요.");
  await updateDisplayName(req.app.locals.bindings().DB, req.user.id, displayName);
  res.redirect(303, "/profile");
});
profileRoutes.post("/logout", loadSession, requireActive, requireCsrf, async (req, res) => {
  await deleteSession(req.app.locals.bindings().DB, cookies(req.headers.cookie).session);
  res.append("Set-Cookie", [sessionCookie("", 0), csrfCookie("", 0)]);
  res.redirect(303, "/");
});
