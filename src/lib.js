export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}

export function normalizeText(value = "") {
  return String(value).normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
}

export function slugify(value = "") {
  return normalizeText(value)
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

export function parseList(value = "") {
  return [
    ...new Set(
      String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function parseJsonList(value) {
  try {
    return Array.isArray(value) ? value : JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

export function dateTime(epoch) {
  if (!epoch) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
  }).format(new Date(epoch * 1000));
}

export function kstParts(epoch) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(epoch * 1000));
  return Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
}

export function form(request) {
  const type = request.headers.get("content-type") || "";
  if (
    !type.includes("application/x-www-form-urlencoded") &&
    !type.includes("multipart/form-data")
  )
    throw new HttpError(415, "지원하지 않는 요청 형식입니다.");
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 6_000_000) throw new HttpError(413, "요청이 너무 큽니다.");
  return request.formData();
}

export function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

export function redirect(location, headers = {}) {
  return new Response(null, { status: 303, headers: { location, ...headers } });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function route(pathname, pattern) {
  const keys = [];
  const source = pattern.replace(/:[^/]+/g, (part) => {
    keys.push(part.slice(1));
    return "([^/]+)";
  });
  const match = pathname.match(new RegExp(`^${source}/?$`));
  return match
    ? Object.fromEntries(
        keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]),
      )
    : null;
}

export function absoluteUrl(env, path) {
  return new URL(path, env.SITE_ORIGIN).href;
}
