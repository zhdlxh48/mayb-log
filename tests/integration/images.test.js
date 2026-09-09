import assert from "node:assert/strict";
import test from "node:test";
import { sampleImageUuid, samplePostUuid } from "../helpers/fixtures.js";
import { origin, withWorker } from "../helpers/worker.js";

test("R2 media routes serve valid keys and reject invalid paths", () =>
  withWorker(async () => {
    const image = await fetch(`${origin}/media/posts/${samplePostUuid}/${sampleImageUuid}.webp`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/webp");
    assert.equal((await fetch(`${origin}/media/posts/no/no.webp`)).status, 404);
  }));
