# mayb-log 구조

## 요청과 인증

`src/hooks.server.ts`는 Paraglide middleware와 Better Auth handler를 연결합니다. Better Auth는 `username()`, `captcha(...)`, `sveltekitCookies(...)`만 사용하며 비밀번호, session, Turnstile을 담당합니다. 이메일은 가입 정보로 저장하지만 인증하지 않습니다. 공식 `session.cookieCache`를 120초 사용해 반복된 session D1 read를 줄입니다.

mayb-log 고유 계정 상태는 `user.approved` 하나입니다. `src/lib/server/auth/guards.ts`의 `requireUser()`가 현재 request의 로그인과 승인을 확인합니다. 보호 layout은 화면 이동 편의를 위한 것이며, 모든 변경 action과 media 및 Preview endpoint가 action body 첫 단계에서 이 helper를 직접 호출합니다.

## 데이터와 조회

`posts.id`는 URL에 쓰는 INTEGER AUTOINCREMENT이고, immutable `assetId` UUID는 R2 namespace입니다. 공개 상태는 `publishedAt` 하나로 정합니다.

- `NULL`: 임시 글
- 미래: 예약 글
- 현재 또는 과거: 공개 글

목록, 상세, 편집, RSS, sitemap query는 필요한 column만 각각 선택합니다. 목록과 sitemap은 본문을 읽지 않으며 RSS는 최근 공개 글 30개만 읽습니다. 검색의 1~2글자 query는 제목, 부제, 설명에 escaped LIKE를 사용하고 3글자 이상은 FTS trigram을 사용합니다. 작성자 filter key는 immutable username이고 화면에는 nickname을 표시합니다.

Category와 Tag는 JSON aggregate로 한 번에 읽습니다. 글과 관계 변경은 D1 batch로 묶고, update/delete 존재 확인은 `RETURNING` 결과를 사용합니다. 범용 DAO나 repository 계층은 두지 않습니다.

DB schema는 `src/lib/server/db/schema`, 목적별 query는 `src/lib/server/db/queries`, migration은 `drizzle`에 있습니다. 날짜 검색과 보관함의 달력 경계는 `Asia/Seoul`입니다.

## Markdown과 이미지

`src/lib/server/markdown/render.ts`가 Markdown HTML의 유일한 source입니다. unified pipeline은 GFM, `remark-directive`, raw HTML 처리, `rehype-sanitize`, highlight 순서로 안전한 HTML을 만듭니다. `src/lib/server/markdown/directives.ts`가 directive 추가 위치입니다.

raw fragment는 HAST로 parse합니다. 공백을 제외한 top-level element가 iframe 하나일 때만 제한된 HTTP(S) iframe을 허용하고 나머지는 원문 글자로 표시합니다. `/api/markdown-preview`와 공개 글은 같은 renderer와 sanitizer를 사용합니다. Preview는 버튼을 눌렀고 본문이 직전 Preview와 달라졌을 때만 요청합니다.

편집기는 plain textarea입니다. `.md` import는 `File.text()`로 처리합니다. 이미지 선택 시 browser-image-compression이 WebP, 긴 변 1600px, 최대 4MiB로 줄인 뒤 한 이미지씩 `/api/media/{assetId}`에 보냅니다. 서버는 MIME, 크기, WebP magic bytes를 검사하고 `posts/{assetId}/{imageId}.webp`에 저장합니다. 공개 URL은 `/media/{assetId}/{imageId}.webp`이고 response body는 R2에서 stream합니다.

Image list는 삽입과 명시적 삭제만 합니다. 같은 파일도 새 UUID로 저장합니다. 화면 이탈, 글 삭제, Markdown 변경을 근거로 object를 자동 정리하지 않으며 orphan은 허용합니다.

## UI, 국제화, 시각

공통 색, typography, semantic element는 `src/global.css`에, 컴포넌트 모양은 각 Svelte 파일의 scoped CSS에 둡니다. CSS framework는 사용하지 않습니다. 정보 중심의 간단한 header, table, form grid를 유지합니다.

Paraglide message source는 `messages/{ko,ja,en}.json`입니다. 전략은 locale cookie, 브라우저 선호 언어, 기본 한국어 순서입니다. 언어 변경은 공식 setter가 cookie를 갱신하고 document를 reload합니다. locale path prefix와 Post language column은 없습니다. document `<html lang>`만 현재 UI locale을 따릅니다.

DB date/time은 UTC instant입니다. machine-readable 값은 ISO 8601이고 `LocalDate.svelte`가 hydration 후 현재 UI locale과 브라우저 timezone으로 화면 text를 바꿉니다.

## SEO와 cache

`Seo.svelte`가 canonical, Open Graph, Twitter metadata를 만들고 상세 글은 BlogPosting JSON-LD를 제공합니다. 페이지가 나뉜 글 목록은 각 page URL을 canonical로 사용합니다. sitemap은 noindex, 임시 글, 미래 글을 제외하고 `updatedAt`을 lastmod로 사용합니다. RSS는 최근 공개 글 30개와 본문을 제공합니다. RSS와 sitemap만 5분 public cache를 사용하며 HTML은 edge cache하지 않습니다. R2 image는 immutable cache header를 사용합니다.

## 유지보수

- 화면 문구: `messages/*.json`을 고친 뒤 `pnpm i18n:compile`
- Post 규칙과 query: `src/lib/server/db/queries/posts.ts`, 검색은 `search.ts`
- directive: `src/lib/server/markdown/directives.ts`에 handler와 필요한 Zod validation만 추가
- 공용 Markdown 정책: `src/lib/server/markdown/render.ts` 한 곳만 수정
- 편집 UI와 image 삽입: `src/lib/components/PostForm.svelte`
- 인증 정책: Better Auth config와 `requireUser()`
- schema: Drizzle schema 수정, migration 생성, local migration과 smoke 후 remote 적용

새 기능은 route, 해당 query, 필요한 컴포넌트만 수정합니다. 같은 코드가 실제로 반복되기 전에는 새 abstraction을 만들지 않습니다.
