import assert from "node:assert/strict";
import test from "node:test";
import { imageKey, validateImages } from "../../src/services/images.js";

test("image paths, UUIDs, and WebP magic are validated", () => {
  const post = "11111111-1111-4111-8111-111111111111";
  const image = "22222222-2222-4222-8222-222222222222";
  const buffer = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);
  assert.equal(imageKey(post, image), `posts/${post}/${image}.webp`);
  assert.equal(
    validateImages(post, [{ originalname: `${image}.webp`, mimetype: "image/webp", buffer }], [])
      .uploads.length,
    1,
  );
  assert.throws(
    () =>
      validateImages(
        post,
        [{ originalname: `${image}.svg`, mimetype: "image/svg+xml", buffer: Buffer.from("<svg") }],
        [],
      ),
    /WebP/,
  );
});
