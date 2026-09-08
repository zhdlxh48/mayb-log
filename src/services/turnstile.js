import { HttpError } from "../lib.js";

export async function verifyTurnstile(bindings, token, action, ip) {
  const body = new FormData();
  body.set("secret", bindings.TURNSTILE_SECRET_KEY || "");
  body.set("response", token || "");
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const result = await response.json();
  const test = bindings.TURNSTILE_SITE_KEY === "1x00000000000000000000AA";
  if (!result.success || (!test && (result.hostname !== new URL(bindings.SITE_ORIGIN).hostname || result.action !== action)))
    throw new HttpError(400, "사람인지 확인하지 못했습니다. 다시 시도해 주세요.");
}
