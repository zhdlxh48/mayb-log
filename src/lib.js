export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const PAGE_SIZE = 20;

export function cookies(header = "") {
  return Object.fromEntries(
    header.split(";").map((part) => part.trim().split(/=(.*)/s)).filter(([key]) => key),
  );
}

export function values(value) {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

export function uniqueText(value) {
  return [...new Set(values(value).flatMap((item) => String(item).split(",")).map((item) => item.trim()).filter(Boolean))];
}

export function positiveIds(value) {
  return [...new Set(values(value).map(Number).filter(Number.isSafeInteger).filter((id) => id > 0))];
}

export function integer(value, fallback = 1) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function dateEpoch(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, "날짜 형식이 올바르지 않습니다.");
  const epoch = Date.parse(`${value}T00:00:00+09:00`);
  if (!Number.isFinite(epoch) || new Date(epoch + 9 * 3600_000).toISOString().slice(0, 10) !== value)
    throw new HttpError(400, "존재하지 않는 날짜입니다.");
  return Math.floor(epoch / 1000);
}

export function formatDate(epoch) {
  if (!epoch) return "";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(epoch * 1000);
}

export function pageBlock(page, total) {
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), last);
  const start = Math.floor((current - 1) / 10) * 10 + 1;
  return {
    current,
    last,
    pages: Array.from({ length: Math.min(10, last - start + 1) }, (_, index) => start + index),
    previous: start > 1 ? start - 1 : null,
    next: start + 10 <= last ? start + 10 : null,
  };
}

export function json(value, fallback = []) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function escapeXml(value) {
  return String(value ?? "").replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]);
}
