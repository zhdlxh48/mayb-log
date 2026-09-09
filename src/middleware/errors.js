import { HttpError } from "../lib.js";

export function notFound(req, res, next) {
  next(new HttpError(404, "페이지를 찾을 수 없습니다."));
}

export function errors(error, req, res, _next) {
  const constraint = /constraint|foreign key|unique/i.test(error.message || "");
  const inputError = constraint || error.name === "MulterError";
  const status = error.status || (inputError ? 400 : 500);
  if (status >= 500) console.error(error);
  const message =
    status >= 500
      ? "요청을 처리하지 못했습니다."
      : inputError
        ? "입력값 또는 파일을 확인해 주세요."
        : error.message;
  res.status(status).renderPage("errors/error", { title: `${status}`, message, noindex: true });
}
