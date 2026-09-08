import { currentSession } from "./auth.js";
import { navigationData } from "./data.js";
import { html, HttpError } from "./lib.js";
import { authRoute } from "./routes-auth.js";
import { adminRoute } from "./routes-admin.js";
import { publicRoute } from "./routes-public.js";
import { layout } from "./views.js";

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const session = await currentSession(request, env);
      if (url.pathname.startsWith("/media/"))
        return media(request, env, url.pathname.slice(7));
      const nav = await navigationData(env.DB);
      const context = { request, env, url, session, nav };
      const response =
        (await adminRoute(context)) ||
        (await authRoute(context)) ||
        (await publicRoute(context));
      if (response) return response;
      return html(
        layout(env, nav, session, {
          title: "404",
          description: "페이지를 찾을 수 없습니다.",
          canonical: url.pathname,
          noindex: true,
          body: '<p>요청한 페이지를 찾을 수 없습니다.</p><p><a href="/">홈으로 이동</a></p>',
        }),
        404,
      );
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (!(error instanceof HttpError))
        console.error("Request failed", error?.message);
      let nav = { series: [], categories: [], tags: [], archive: [] };
      try {
        nav = await navigationData(env.DB);
      } catch {}
      const title = status === 500 ? "서버 오류" : "요청 오류";
      const body = `<p>${status === 500 ? "잠시 후 다시 시도해 주세요." : escape(error.message)}</p>`;
      return html(
        layout(env, nav, null, {
          title,
          description: title,
          canonical: new URL(request.url).pathname,
          noindex: true,
          body,
        }),
        status,
      );
    }
  },
};

async function media(request, env, key) {
  if (request.method !== "GET" && request.method !== "HEAD")
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(request.method === "HEAD" ? null : object.body, {
    headers,
  });
}

const escape = (value) =>
  String(value || "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
