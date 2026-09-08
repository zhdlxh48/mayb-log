import { Router } from "express";
import { imageKey, validUuid } from "../services/images.js";

export const mediaRoutes = Router();
mediaRoutes.get("/media/posts/:postUuid/:imageUuid.webp", async (req, res) => {
  if (!validUuid(req.params.postUuid) || !validUuid(req.params.imageUuid)) return res.sendStatus(404);
  const object = await req.app.locals.bindings().MEDIA.get(imageKey(req.params.postUuid, req.params.imageUuid));
  if (!object) return res.sendStatus(404);
  res.set({ "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", ETag: object.httpEtag });
  res.send(Buffer.from(await object.arrayBuffer()));
});
