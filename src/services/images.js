import multer from "multer";
import { HttpError, values } from "../lib.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 8 * 1024 * 1024, fields: 200 },
}).array("images", 10);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validUuid = (value) => UUID.test(String(value));
export const imageKey = (postUuid, imageUuid) => `posts/${postUuid}/${imageUuid}.webp`;

export function validateImages(postUuid, files = [], deleteIds = []) {
  if (!validUuid(postUuid)) throw new HttpError(400, "게시글 이미지 경로가 올바르지 않습니다.");
  const uploads = files.map((file) => {
    const imageUuid = file.originalname.replace(/\.webp$/i, "");
    const magic = file.buffer.length >= 12 && file.buffer.subarray(0, 4).toString("ascii") === "RIFF" && file.buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (!validUuid(imageUuid) || file.mimetype !== "image/webp" || !magic)
      throw new HttpError(400, "WebP 이미지만 업로드할 수 있습니다.");
    return { key: imageKey(postUuid, imageUuid), body: file.buffer };
  });
  const deletes = [...new Set(values(deleteIds).map(String))];
  if (deletes.some((id) => !validUuid(id))) throw new HttpError(400, "삭제할 이미지 경로가 올바르지 않습니다.");
  if (uploads.some((upload) => deletes.includes(upload.key.slice(-41, -5)))) throw new HttpError(400, "같은 이미지를 업로드하고 삭제할 수 없습니다.");
  return { uploads, deletes: deletes.map((id) => imageKey(postUuid, id)) };
}

export async function putImages(media, uploads) {
  const completed = [];
  try {
    for (const image of uploads) {
      if (await media.head(image.key)) throw new HttpError(409, "이미지 식별자가 이미 사용 중입니다.");
      await media.put(image.key, image.body, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
      completed.push(image.key);
    }
    return completed;
  } catch (error) {
    await Promise.allSettled(completed.map((key) => media.delete(key)));
    throw error;
  }
}

export async function listImages(media, postUuid) {
  const prefix = `posts/${postUuid}/`;
  const objects = [];
  let cursor;
  do {
    const result = await media.list({ prefix, cursor });
    objects.push(...result.objects);
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
  return objects.map(({ key, size }) => ({
    key,
    uuid: key.slice(prefix.length, -5),
    url: `/media/${key}`,
    size,
  }));
}

export async function deletePrefix(media, postUuid) {
  let cursor;
  do {
    const result = await media.list({ prefix: `posts/${postUuid}/`, cursor });
    if (result.objects.length) await media.delete(result.objects.map((object) => object.key));
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
}
