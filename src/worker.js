import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./app.js";
import { bindings } from "./platform/cloudflare.js";

const app = createApp(bindings);
app.listen(3000);

export default httpServerHandler({ port: 3000 });
