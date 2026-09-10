# mayb-log 구조

## 요청 흐름

`src/hooks.server.ts`가 요청마다 Better Auth 인스턴스를 만들고 세션과 사용자를 `event.locals`에 넣습니다. 일반 페이지는 SvelteKit의 server load에서 D1을 읽어 SSR HTML을 만들고, 변경 작업은 form action으로 처리합니다. hover preload는 `src/app.html`에서 꺼 두었습니다.

보호 경로는 `src/routes/(protected)/+layout.server.ts` 한 곳에서 로그인, 승인, 정지 상태를 확인합니다. 세션 생성 직전에도 `src/lib/server/auth/auth.ts`의 hook이 `approved`와 `banned`를 검사하므로 승인 취소나 정지가 기존 세션에도 반영됩니다.

## 데이터

Better Auth가 생성한 `user`, `session`, `account`, `verification`이 인증의 기준입니다. 별도 profile table은 없습니다. 콘텐츠 table은 다음과 같습니다.

- `posts`: Markdown 본문, 작성자, 공개 상태, 시리즈 위치
- `series`: 시리즈 이름과 설명
- `categories`, `post_categories`: 카테고리와 글의 다대다 관계
- `tags`, `post_tags`: 정규화한 태그와 글의 다대다 관계
- `posts_fts`: 검색용 FTS5 index

FTS는 migration의 SQLite trigger가 posts의 insert/update/delete를 따라갑니다. 앱은 FTS를 따로 동기화하지 않습니다. 글 목록과 검색은 DB에서 필터, 정렬, 페이지 구분을 끝내며 작성자·시리즈·분류는 글마다 추가 query를 반복하지 않습니다.

DB를 수정할 때는 `src/lib/server/db/schema`을 바꾸고 Drizzle migration을 생성합니다. 조회와 저장은 `src/lib/server/db/queries`의 목적이 분명한 함수에 둡니다. 범용 repository나 service 계층은 추가하지 않습니다.

## 인증

Better Auth의 Username plugin이 아이디와 비밀번호, session cookie를 담당합니다. 이메일 서비스는 쓰지 않으며, Better Auth의 필수 email 칼럼에는 `아이디@account.invalid` 형태의 내부 값만 저장합니다. 아이디는 가입 후 바꿀 수 없습니다. mayb-log 고유 정책은 `user.approved` 하나입니다.

가입과 로그인 화면의 Turnstile 결과는 Better Auth Captcha plugin에 `x-captcha-response`로 전달합니다. 자체 password hash, session token, CSRF token, captcha 검증 코드는 없습니다. 비밀번호 변경은 현재 비밀번호를 다시 확인하고 다른 세션을 폐기합니다.

## 글과 이미지

글의 기준 본문은 `posts.body_markdown` 하나입니다. 공개할 때 `src/lib/server/markdown/render.ts`가 unified pipeline으로 GFM, sanitize, server syntax highlighting을 적용합니다. 일반 raw HTML은 글자로 보이고 iframe만 제한된 속성과 HTTP(S) URL로 허용됩니다.

Carta는 편집과 preview를 담당합니다. preview는 편집기 기본 동작을 사용하며 공개 HTML의 보안 기준은 서버 renderer입니다. attachment plugin은 이미지를 `browser-image-compression`으로 WebP 변환한 뒤 `/api/media`에 보냅니다. 서버는 4MiB, MIME, WebP magic bytes를 확인하고 `media/{uuid}.webp`로 R2에 저장합니다. `/media/{uuid}.webp`는 R2 body를 그대로 stream합니다.

## 화면과 SEO

Pico CSS가 기본 control과 typography를 제공합니다. 색, 공통 폭, form grid 같은 사이트 전체 값은 `src/app.css`에 있고 각 화면과 컴포넌트의 모양은 해당 `.svelte` 파일의 `<style>`에 있습니다.

공개 화면은 모두 SSR입니다. `Seo.svelte`가 canonical, Open Graph, Twitter metadata를 만들고 글 화면은 BlogPosting JSON-LD를 추가합니다. draft와 미래 글은 공개 query에서 제외됩니다. noindex 글은 공개와 RSS에는 포함되지만 sitemap에서는 제외됩니다.

## 테스트 원칙

`tests/unit/content.test.ts`는 Markdown raw HTML/iframe 정책, pagination block, 서울 날짜 경계만 검사합니다. `tests/smoke/app.spec.ts` 한 파일은 Chromium에서 실제 Better Auth, D1, R2, SvelteKit action을 사용해 초안·이미지·공개·검색·Archive·수정·삭제를 확인합니다. 프레임워크 동작이나 파일 구조를 다시 검사하는 테스트는 만들지 않습니다.

기능을 추가할 때는 route의 load/action, 해당 query, 필요한 Svelte component만 수정합니다. 같은 코드가 세 번째로 반복되기 전에는 새 abstraction을 만들지 않는 것이 이 저장소의 기본 유지보수 원칙입니다.
