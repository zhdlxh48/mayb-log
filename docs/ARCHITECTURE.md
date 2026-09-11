# mayb-log 구조

## 요청과 인증

`src/hooks.server.ts`는 Paraglide middleware와 Better Auth handler를 연결합니다. Better Auth는 `username()`, `captcha(...)`, `sveltekitCookies(...)`만 사용하며 비밀번호, session, Turnstile을 담당합니다. 이메일은 가입 정보로 저장하지만 인증하지 않습니다. 공식 `session.cookieCache`를 120초 사용해 반복된 session D1 read를 줄입니다.

mayb-log 고유 계정 상태는 `user.approved` 하나입니다. `src/lib/server/auth/guards.ts`의 `requireUser()`가 현재 request의 로그인과 승인을 확인합니다. 보호 layout은 화면 이동 편의를 위한 것입니다. 모든 보호 page server load는 D1/R2 접근 전에, 모든 변경 action과 media 및 Preview endpoint는 action body 첫 단계에서 이 helper를 직접 호출합니다.

## 데이터와 조회

`posts.id`는 URL에 쓰는 INTEGER AUTOINCREMENT이고, immutable `assetId` UUID는 R2 namespace입니다. 공개 상태는 `publishedAt` 하나로 정합니다.

- `NULL`: 임시 글
- 미래: 예약 글
- 현재 또는 과거: 공개 글

목록, 상세, 편집, RSS, sitemap query는 필요한 column만 각각 선택합니다. 목록과 sitemap은 본문을 읽지 않으며 RSS는 최근 공개 글 30개만 읽습니다. 검색의 1~2글자 query는 제목, 부제, 설명에 escaped LIKE를 사용하고 3글자 이상은 FTS trigram을 사용합니다. 작성자 filter key는 immutable username이고 화면에는 nickname을 표시합니다.

Category와 Tag는 JSON aggregate로 한 번에 읽습니다. Tag lookup table은 없으며 `post_tags(post_id, tag)`가 글별 문자열을 직접 저장합니다. Post insert/update, category 관계, tag 관계는 한 D1 batch로 처리합니다. 관계 insert도 Post가 존재할 때만 행을 만드는 `INSERT ... SELECT`라서 없는 Post 수정은 404가 되고 중간 실패는 전체 rollback됩니다. update/delete 존재 확인은 `RETURNING` 결과를 사용합니다. 범용 DAO나 repository 계층은 두지 않습니다.

입력 상한은 `src/lib/limits.ts` 한 곳에 있습니다. Markdown은 UTF-8 1MiB이고 Preview의 JSON request에는 별도의 4MiB 상한을 둡니다. Post 카테고리·태그는 각각 30개, 태그 하나는 64글자이며 쉼표로 구분한 원본 태그 입력은 4096글자까지입니다. 공개 검색은 검색어 200글자, 시리즈·카테고리·태그 각 20개, 태그 64글자, 작성자 아이디 30글자입니다. 날짜와 날짜·시각은 실제 한국 달력 값까지 엄격히 검사합니다.

DB schema는 `src/lib/server/db/schema`, 목적별 query는 `src/lib/server/db/queries`, migration은 `drizzle`에 있습니다. 날짜 검색과 보관함의 달력 경계는 `Asia/Seoul`입니다.

## Markdown과 이미지

`src/lib/server/markdown/render.ts`가 Markdown HTML의 유일한 source입니다. unified pipeline은 GFM, `remark-directive`, raw HTML 처리, `rehype-sanitize`, highlight 순서로 안전한 HTML을 만듭니다. `src/lib/server/markdown/directives.ts`가 directive 추가 위치입니다. 지원하지 않거나 잘못 작성한 directive는 원문을 literal text로 보존하고 non-fatal diagnostic을 남깁니다. Preview는 이 경고를 표시하지만 저장과 발행을 막지 않으며 공개 글과 RSS는 같은 최종 HTML만 사용합니다.

raw fragment는 HAST로 parse합니다. 공백을 제외한 top-level element가 iframe 하나일 때만 제한된 HTTP(S) iframe을 허용하고 나머지는 원문 글자로 표시합니다. `/api/markdown-preview`와 공개 글은 같은 renderer와 sanitizer를 사용합니다. Preview는 버튼을 눌렀고 본문이 직전 Preview와 달라졌을 때만 요청하며 HTML과 간단한 line/column diagnostic을 받습니다.

편집기는 plain textarea입니다. `.md` import는 `File.text()`로 처리합니다. 이미지 선택 시 browser-image-compression이 WebP, 긴 변 1600px, 최대 4MiB로 줄인 뒤 한 이미지씩 `/api/media/{assetId}`에 보냅니다. 서버는 MIME, 크기, WebP magic bytes를 검사하고 `posts/{assetId}/{imageId}.webp`에 저장합니다. 공개 URL은 `/media/{assetId}/{imageId}.webp`이고 response body는 R2에서 stream합니다.

Image list는 삽입과 명시적 삭제만 합니다. 같은 파일도 새 UUID로 저장합니다. 화면 이탈, 글 삭제, Markdown 변경을 근거로 object를 자동 정리하지 않으며 orphan은 허용합니다.

## UI, 국제화, 시각

공통 색, typography, semantic element는 `src/global.css`에, 컴포넌트 모양은 각 Svelte 파일의 scoped CSS에 둡니다. CSS framework는 사용하지 않습니다. 정보 중심의 간단한 header, table, form grid를 유지합니다.

Paraglide message source는 `messages/{ko,ja,en}.json`입니다. 전략은 locale cookie, 브라우저 선호 언어, 기본 한국어 순서입니다. 언어 변경은 공식 setter가 cookie를 갱신하고 document를 reload합니다. locale path prefix와 Post language column은 없습니다. document `<html lang>`만 현재 UI locale을 따릅니다. `src/lib/paraglide`는 생성물이므로 Git에서 제외하며, `package.json`의 compile 옵션과 `vite.config.ts`의 plugin 옵션은 같은 출력 경로·전략을 유지합니다.

DB date/time은 UTC instant입니다. machine-readable 값은 ISO 8601입니다. `LocalDate.svelte`는 SSR에서 현재 UI locale의 한국 시각을 사람이 읽을 수 있게 출력하고, hydration 후 같은 locale의 브라우저 timezone 표시로 바꿉니다.

## SEO와 cache

`Seo.svelte`가 canonical, Open Graph, Twitter metadata를 만들고 상세 글은 BlogPosting JSON-LD를 제공합니다. 페이지가 나뉜 글 목록은 각 page URL을 canonical로 사용합니다. sitemap은 noindex, 임시 글, 미래 글을 제외하고 `updatedAt`을 lastmod로 사용합니다. RSS는 최근 공개 글 30개와 본문을 제공합니다. RSS와 sitemap response는 5분 public cache header를 보냅니다. 전역 Worker cache나 HTML edge cache는 사용하지 않습니다. R2 image는 immutable cache header를 사용합니다.

CSP의 `style-src`는 `self`만 허용하고 `style-src-attr 'unsafe-inline'`은 SvelteKit이 생성하는 접근성 announcer의 inline style attribute에만 사용합니다. `script-src`는 inline script를 허용하지 않으며 Markdown sanitizer도 사용자 `style` attribute를 허용하지 않습니다. framework 생성 source를 수정하는 build transform은 사용하지 않습니다.

## Migration 운영 규칙

`DROP`이나 `RENAME`처럼 호환성을 깨는 schema 변경은 한 번의 deploy에서 기존 schema 제거와 application 전환을 동시에 하지 않습니다. 먼저 기존 코드와 새 코드가 모두 동작하는 expand migration을 배포하고 application을 전환한 뒤, 다음 별도 deploy와 migration에서 더 이상 사용하지 않는 schema를 contract합니다. 이미 성공적으로 적용한 `0002_numerous_korvac.sql`은 다시 변경하지 않습니다.

## 유지보수

- 화면 문구: `messages/*.json`을 고친 뒤 `pnpm i18n:compile`
- Post 규칙과 query: `src/lib/server/db/queries/posts.ts`, 검색은 `search.ts`
- directive: `src/lib/server/markdown/directives.ts`에 handler와 필요한 Zod validation만 추가
- 공용 Markdown 정책: `src/lib/server/markdown/render.ts` 한 곳만 수정
- 편집 UI와 image 삽입: `src/lib/components/PostForm.svelte`
- 인증 정책: Better Auth config와 `requireUser()`
- schema: Drizzle schema 수정, migration 생성, local migration과 smoke 후 remote 적용

새 기능은 route, 해당 query, 필요한 컴포넌트만 수정합니다. 같은 코드가 실제로 반복되기 전에는 새 abstraction을 만들지 않습니다.
