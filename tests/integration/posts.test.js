import assert from "node:assert/strict";
import test from "node:test";
import { encodedPost, login } from "../helpers/auth.js";
import { resetDatabase, sql } from "../helpers/database.js";
import { origin, withWorker } from "../helpers/worker.js";

test("active users can create, cross-edit, and delete posts while preserving the author", () =>
  withWorker(async () => {
    resetDatabase();
    const first = await login();
    const uuid = crypto.randomUUID();
    const create = await encodedPost(
      "/posts",
      {
        csrf: first.csrf,
        post_uuid: uuid,
        title: "Integration Post",
        description: "Integration description",
        body_markdown: "Integration **body**",
        tags: "one,two",
      },
      first.cookie,
    );
    assert.equal(create.status, 303);
    const post = sql(`SELECT id, author_user_id FROM posts WHERE uuid = '${uuid}'`)[0];
    sql(
      "INSERT INTO users (username, display_name, password_hash, password_salt, password_iterations, status, created_at, updated_at) SELECT 'integration_second', 'Second', password_hash, password_salt, password_iterations, 'active', created_at, updated_at FROM users WHERE username = 'testuser'",
    );
    const second = await login("integration_second");
    assert.equal(
      (
        await encodedPost(
          `/posts/${post.id}/update`,
          {
            csrf: second.csrf,
            post_uuid: uuid,
            title: "Updated Integration Post",
            description: "Updated description",
            body_markdown: "Updated body",
          },
          second.cookie,
        )
      ).status,
      303,
    );
    assert.equal(
      sql(`SELECT author_user_id FROM posts WHERE id = ${post.id}`)[0].author_user_id,
      post.author_user_id,
    );
    const edit = await (
      await fetch(`${origin}/posts/${post.id}/edit`, { headers: { Cookie: second.cookie } })
    ).text();
    assert.match(edit, new RegExp(`action="/posts/${post.id}/delete"`));
    assert.match(edit, /data-confirm="이 게시글을 삭제하시겠습니까\?"/);
    assert.equal(
      (await encodedPost(`/posts/${post.id}/delete`, { csrf: second.csrf }, second.cookie)).status,
      303,
    );
  }));
