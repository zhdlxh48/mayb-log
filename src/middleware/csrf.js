import { timingSafeEqual } from "node:crypto";
import { HttpError } from "../lib.js";

function same(left = "", right = "") {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireCsrf(req, res, next) {
  const expectedOrigin = `${req.protocol}://${req.get("host")}`;
  if (
    !req.user ||
    req.get("origin") !== expectedOrigin ||
    !same(req.body?.csrf, req.user.csrf_token)
  )
    return next(new HttpError(403, "요청을 확인할 수 없습니다. 다시 시도해 주세요."));
  next();
}

export function requireOrigin(req, res, next) {
  if (req.get("origin") !== `${req.protocol}://${req.get("host")}`)
    return next(new HttpError(403, "요청 출처를 확인할 수 없습니다."));
  next();
}
