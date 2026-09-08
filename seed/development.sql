INSERT INTO users (username, display_name, password_hash, password_salt, password_iterations, status, created_at, updated_at)
VALUES ('testuser', 'MayB', 'ZByYgLOBSM0hkx8kgmRQ70Ogipqm2WnjKHwPYMm0CkI=', 'BL1B3TnH/OxMLpVlacU/TQ==', 600000, 'active', 1788793200, 1788793200);

INSERT INTO series (title, description, created_at, updated_at)
VALUES ('Blog Notes', '블로그 개발 기록', 1788793200, 1788793200);

INSERT INTO categories (name, description, created_at, updated_at) VALUES
('Development', '개발 기록', 1788793200, 1788793200),
('Diary', '일상 기록', 1788793200, 1788793200);

INSERT INTO posts (uuid, author_user_id, title, subtitle, description, body_markdown, body_html, series_id, series_position, tags, published_at, created_at, updated_at, draft, noindex)
VALUES (
  '11111111-1111-4111-8111-111111111111', 1, 'Express와 EJS로 다시 만든 블로그', '삭제해도 되는 샘플 글',
  'Cloudflare Workers, D1, R2를 이용한 새 블로그 구조를 소개합니다.',
  '이 글은 **삭제해도 되는 샘플**입니다.\n\n## 간단한 구조\n\nExpress route가 D1 SQL을 실행하고 EJS가 HTML을 만듭니다.\n\n```js\nconsole.log("mayb-log");\n```\n\n![샘플 이미지](/media/posts/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp)',
  '<p>이 글은 <strong>삭제해도 되는 샘플</strong>입니다.</p><h2>간단한 구조</h2><p>Express route가 D1 SQL을 실행하고 EJS가 HTML을 만듭니다.</p><pre><code class="language-js">console.log(&quot;mayb-log&quot;);</code></pre><p><img src="/media/posts/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp" alt="샘플 이미지" loading="lazy"></p>',
  1, 1, '["Cloudflare","D1","js lang"]', 1788724800, 1788724800, 1788724800, 0, 0
);

INSERT INTO posts (uuid, author_user_id, title, subtitle, description, body_markdown, body_html, series_id, series_position, tags, published_at, created_at, updated_at, draft, noindex)
VALUES (
  '33333333-3333-4333-8333-333333333333', 1, '서울 시간으로 찾는 기록', NULL,
  '한국 시간 기준 Archive와 두 글자 검색을 확인하는 샘플입니다.',
  '한국 시간 기준의 **기록**입니다.', '<p>한국 시간 기준의 <strong>기록</strong>입니다.</p>',
  NULL, NULL, '["기록"]', 1766223000, 1766223000, 1766223000, 0, 1
);

INSERT INTO post_categories (post_id, category_id) VALUES (1, 1), (2, 2);
INSERT INTO post_fts (rowid, title, subtitle, description, body) VALUES
(1, 'Express와 EJS로 다시 만든 블로그', '삭제해도 되는 샘플 글', 'Cloudflare Workers, D1, R2를 이용한 새 블로그 구조를 소개합니다.', '이 글은 삭제해도 되는 샘플입니다. 간단한 구조 Express route가 D1 SQL을 실행하고 EJS가 HTML을 만듭니다.'),
(2, '서울 시간으로 찾는 기록', '', '한국 시간 기준 Archive와 두 글자 검색을 확인하는 샘플입니다.', '한국 시간 기준의 기록입니다.');
