import { env } from "cloudflare:workers";

export function bindings() {
  return env;
}
