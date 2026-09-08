import { HttpError } from "../lib.js";

export function requireActive(req, res, next) {
  if (!req.user) return next(new HttpError(401, "로그인이 필요합니다."));
  next();
}
