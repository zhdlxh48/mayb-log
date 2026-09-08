# Express + EJS 최종 개편 보고서

작성일: 2026-09-09 (Asia/Seoul)

## 1. Git 기준

- 시작 `main`: `c58091d7dcd1dc967bfb95ee61d8af745b29c1aa`
- 구현 병합 `main`: `1522119eae069794846d954b7b75b929ce679713`
- 기능 브랜치: `feature/express-ejs-refactor`
- `dev` 병합: `6f1a609d3c26ed5c3e4ff6771a13bd4de875b5f8`
- 기능 커밋: `1ca950bd7fd34e7a3a6f06406869dea94cb83c75`

기능 브랜치는 최신 `main`에서 생성했다. 기능 브랜치를 `dev`에 `--no-ff`로 병합해 검증한 뒤, 최신 `main`을 기능 브랜치에 먼저 병합하고 충돌이 없음을 확인했다. 그 기능 브랜치를 `main`에 직접 `--no-ff`로 병합했다.

## 2. 버전과 최종 구조

- Express `5.2.1`
- EJS `6.0.1`
- Marked `18.0.12`
- Multer `2.3.0`
- Wrangler `4.129.1`

```text
src/
  app.js, worker.js, render.js, lib.js
  routes/       공개·인증·편집 HTTP 흐름
  db/           projection과 조건이 드러나는 D1 SQL
  middleware/   session, active user, CSRF, error
  services/     Markdown, image, password/session, Turnstile
  platform/     Cloudflare binding 경계
views/
  partials/     head, navigation, footer, post row, pagination
  *.ejs         About, 목록, 글, 편집, 검색, 인증, Profile, 오류
public/
  site.css, editor.js, image-editor.js, post-delete.js, search.js
  vendor/       htmx, Prism, Marked, browser-image-compression
migrations/0001_initial.sql
seed/development.sql
```

Wrangler의 Text module 규칙이 실제 `.ejs` 파일을 deployment bundle에 포함한다. `src/render.js`는 Worker 시작 단계에서 EJS로 템플릿을 컴파일한다. `wrangler dev`, dry-run build, 실제 Worker에서 모두 렌더링을 확인했다.

## 3. Route 표

| 구분 | Method | Route |
|---|---|---|
| 공개 | GET | `/`, `/posts`, `/posts/:id`, `/series`, `/categories`, `/archive`, `/search` |
| 인증 화면 | GET | `/login`, `/signup` |
| 미디어·피드 | GET | `/media/posts/:postUuid/:imageUuid.webp`, `/rss.xml`, `/sitemap.xml`, `/robots.txt` |
| 계정 | POST | `/login`, `/signup` |
| 보호 화면 | GET | `/posts/new`, `/posts/:id/edit`, `/series/new`, `/series/:id/edit`, `/categories/new`, `/categories/:id/edit`, `/profile` |
| Post 변경 | POST | `/posts`, `/posts/:id/update`, `/posts/:id/delete` |
| Series 변경 | POST | `/series/create`, `/series/:id/update`, `/series/:id/delete` |
| Category 변경 | POST | `/categories/create`, `/categories/:id/update`, `/categories/:id/delete` |
| Profile | POST | `/profile/update`, `/logout` |

`/admin/*`, `/profile/posts*`, `/profile/series`, `/profile/categories`, `/profile/users`, `/tags*`, `/authors*`, 공개 Series/Category detail은 만들지 않았고 production에서 404를 확인했다.

## 4. D1 schema와 migration

최종 애플리케이션 table은 `users`, `sessions`, `series`, `categories`, `posts`, `post_categories`이며 `post_fts`는 contentless FTS5 virtual table이다. `pages`, `tags`, `post_images` table과 Post slug, 사용자 role·bio·homepage·same_as column은 없다. Index와 constraint는 [migration](../migrations/0001_initial.sql)에 명시돼 있다.

데이터 보존이 필요 없다는 최종 지시에 따라 기존 DB를 변환하는 복잡한 migration 대신 새 APAC D1 `mayb-log-final`을 만들었다. `0001_initial.sql` 15개 명령과 분리된 샘플 seed 7개 명령을 원격에서 성공시켰다. 기존 D1 `mayb-log`은 새 Worker 배포 확인 후 삭제했다.

샘플을 만들 때 사용한 알려진 개발 계정은 production 공개 전에 `inactive`로 변경했다. 사용자가 가입한 계정은 `pending`이며 D1 SQL로 직접 `active`로 바꾼다.

## 5. 세션, 권한, Navigation

raw 256-bit session token은 HttpOnly cookie에만 저장되고 D1에는 SHA-256 hash만 저장된다. 세션 기간은 7일이다. 로그인은 active 사용자만 허용한다. 모든 active 사용자는 모든 Post·Series·Category를 변경할 수 있고 Post 편집 시 최초 `author_user_id`는 유지된다.

변경 POST는 active session, D1의 CSRF token, 정확히 일치하는 Origin을 확인한다. 로그인 성공 시 HttpOnly session cookie와 JavaScript가 읽을 수 있는 CSRF cookie를 함께 발급하며 Logout은 둘 다 지운다. Turnstile과 PBKDF2-SHA256 600,000회를 유지했다.

공개 라우트에는 session middleware가 연결돼 있지 않다. 따라서 session cookie가 있어도 공개 GET의 session D1 read는 0이다. Navigation은 정적인 EJS partial이며 cookie 존재 여부만으로 Login/Profile 문구를 고르므로 taxonomy나 사용자 DB query도 0이다.

## 6. SQL과 검색

Post 목록은 본문을 읽지 않고 `id`, 제목·설명·날짜, 작성자, Series, JSON aggregate Category만 읽는다. 공개 detail은 `body_html`, 편집은 `body_markdown`만 추가로 읽는다. Category N+1 query는 없다. `SELECT *`, `SELECT p.*`, `SELECT c.*`는 source check와 전체 검색으로 부재를 확인했다.

검색 SQL은 `src/db/search.js`에 한 함수로 드러나 있다.

- 3 Unicode 글자 이상: 사용자 입력을 literal phrase로 escape한 `post_fts MATCH`
- 1~2글자: `%`, `_`, `\`를 escape한 title/subtitle/description/body_markdown LIKE
- 반복 Series: `IN`으로 OR
- 반복 Category: relation group과 `HAVING COUNT(DISTINCT ...)`로 AND
- 반복 Tag: tag마다 `json_each(posts.tags)` EXISTS로 AND
- 다른 filter group과 서울 날짜 범위: 모두 AND
- 정렬·`LIMIT 20`·`OFFSET`: D1 SQL
- count와 row, full page의 Series·Category option: 한 D1 batch
- 고정 10-page block: page 13에서 이전 10, 다음 21

`post_fts`는 `content=''`, `contentless_delete=1`, `tokenize='trigram'`이다. Post insert/update/delete 함수가 FTS row를 명시적으로 동기화하며 trigger는 없다. 로컬 D1과 원격 D1 모두 이 schema와 update/delete 동작을 통과했다.

Archive는 `strftime(..., '+9 hours')`로 연·월·count를 한 query에서 읽는다. EJS가 연도별로 묶고 native `details`를 출력한다. 월 링크는 다음 달 시작을 exclusive `to`로 전달한다.

## 7. R2 이미지

최종 bucket은 `mayb-log-media-final`이다. Key와 공개 URL은 각각 다음 형식이다.

```text
posts/{post_uuid}/{image_uuid}.webp
/media/posts/{post_uuid}/{image_uuid}.webp
```

새 이미지는 browser-image-compression으로 Web Worker, 긴 변 1600px, WebP, quality 0.82 설정을 사용하고 Save 전까지 메모리에 둔다. 편집 화면은 R2 prefix를 직접 list해 Used/Unused와 깨진 Markdown 참조를 표시한다. X는 삭제 예정/Undo 상태만 바꾸고 DB 저장 성공 뒤에 R2를 삭제한다.

서버는 UUID, MIME, 8 MiB 제한, WebP magic byte를 확인하며 기존 key overwrite와 업로드·삭제 동시 요청을 거부한다. 새 R2 PUT 뒤 D1 저장이 실패하면 해당 요청에서 올린 key를 best-effort로 삭제한다. 통합 테스트에서 잘못된 Category FK로 D1 실패를 만들고 R2 object가 404가 되는 것을 확인했다. Post 삭제는 D1 Post/FTS 삭제 뒤 R2 prefix 전체를 정리한다.

기존 R2 `mayb-log-media`의 객체 8개는 새 배포 확인 후 목록으로 읽어 삭제했고, 빈 bucket도 삭제했다.

## 8. EJS 화면

실제 EJS 파일은 About, Posts, Post detail/edit, Series index/new/edit, Categories index/new/edit, Archive, Search/results, Login, Signup, Profile, Error, Layout과 5개 partial이다. 사용자 값은 `<%= ... %>`로 escape한다. 서버가 안전하게 만든 `body_html`, JSON-LD, partial 결과만 `<%- ... %>`를 사용한다.

Navigation은 `mayb-log | Posts | Series | Categories | Archive | Search | Login/Profile`만 출력한다. Login의 Sign up은 본문 링크다. Profile은 username, display_name 변경, Logout만 제공한다. 화면은 plain CSS, semantic HTML, native form/table/details/confirm과 vanilla JavaScript로 구성했다.

## 9. 검증과 배포

- 단위 테스트: 7개 성공
- 실제 `wrangler dev` 통합: 공개 route, session/CSRF, 다른 작성자 편집, SQL 검색, Multer multipart, R2 업로드·rollback, RSS/Sitemap 성공
- 로컬 browser: Chromium 5개, WebKit 5개 성공
- 로컬 Firefox: Windows side-by-side runtime 오류로 실행 파일을 시작하지 못함
- GitHub Linux CI: Chromium·Firefox·WebKit을 포함한 verify 성공
- Worker dry-run: gzip 399.73 KiB
- 기능 CI: https://github.com/zhdlxh48/mayb-log/actions/runs/34281471300
- dev CI: https://github.com/zhdlxh48/mayb-log/actions/runs/34281693539
- main CI·deploy: https://github.com/zhdlxh48/mayb-log/actions/runs/34281968818
- production: https://mayb-log.mayb.workers.dev/
- 구현 배포 Worker version: `b3b4fe1e-7534-4467-97c5-00b3df111de1`

Production에서 `/`, Posts, Post detail, Series, Categories, Archive, Search, Login, Signup, RSS, Sitemap, robots, R2 sample media가 200임을 확인했다. 금지 route는 404였고 최종 Navigation과 CSP header도 직접 확인했다.

## 10. 실제 남은 항목

- 실제 Safari는 검증하지 못했고 Playwright WebKit으로 대신 검증했다.
- 로컬 Firefox는 Windows runtime 문제로 실행하지 못했지만 GitHub Actions의 Linux Firefox 검증은 성공했다.
- Lighthouse 점수는 이번 지시의 필수 검증에 포함하지 않아 측정하지 않았다.
- production 계정은 의도적으로 활성 계정을 남기지 않았다. 사용자가 Sign up 후 자신의 username을 D1에서 `active`로 변경해야 한다.
