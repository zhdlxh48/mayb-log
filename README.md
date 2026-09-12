# mayb-log

SvelteKit으로 만든 개인 블로그입니다. Cloudflare Workers에서 실행하며 D1에 계정과 글을, R2에 이미지를 저장합니다.

## 기술 구성

- SvelteKit 2.70.3, Svelte 5.57.0, TypeScript 6.0.3
- Better Auth 1.7.4, Drizzle ORM 0.45.2, Superforms, Zod
- unified/remark/rehype, Paraglide, browser-image-compression, feed
- Cloudflare Workers, D1, R2, Wrangler

CSS framework와 client Markdown renderer는 사용하지 않습니다. 공통 스타일은 `src/global.css`, 화면별 스타일은 Svelte 컴포넌트의 `<style>`에 둡니다.

## 로컬 실행

Node 24.20.0과 pnpm 11.25.0을 사용합니다.

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

`.dev.vars`의 `BETTER_AUTH_SECRET`은 32자 이상의 임의 문자열로 바꿉니다. 로컬에서는 저장소에 들어 있는 Cloudflare Turnstile 테스트 키를 사용할 수 있습니다.

```bash
pnpm format:check
pnpm lint
pnpm check
pnpm test:unit
pnpm test:smoke
pnpm build
pnpm preview
```

Paraglide 코드는 설치할 때 자동 생성되며 `src/lib/paraglide`는 Git에서 제외합니다. 메시지를 바꾼 뒤 즉시 타입을 갱신하려면 `pnpm i18n:compile`을 실행합니다. CLI와 Vite plugin의 locale 전략 및 출력 경로는 항상 함께 수정합니다.

## 인증과 계정 승인

가입할 때 아이디, 닉네임, 이메일, 비밀번호를 저장합니다. 로그인은 아이디와 비밀번호만 사용하며 이메일 인증과 이메일 발송 서비스는 없습니다. 아이디는 바꿀 수 없고, 닉네임과 비밀번호는 `/profile`에서 변경합니다.

새 계정은 `approved = 0`으로 생성됩니다. 첫 가입 후 운영 D1에서 승인합니다.

```bash
node node_modules/wrangler/bin/wrangler.js d1 execute DB --remote --command "UPDATE user SET approved = 1 WHERE username = 'your_id';"
```

`approved`가 유일한 사용 승인 상태입니다. 승인된 작성자는 모든 글, 시리즈, 카테고리를 관리할 수 있습니다. 글의 `authorId`는 최초 작성자를 표시하며 다른 작성자가 수정해도 바뀌지 않습니다.

## 글 작성과 이미지

- `Save draft`는 `publishedAt`을 비웁니다.
- `Publish`는 발행 시각이 비어 있으면 현재 시각을 사용합니다. 미래 시각은 예약 글입니다.
- `No index`는 공개와 사이트 검색 및 RSS에는 포함하되 검색엔진 sitemap에서 제외합니다.
- 본문은 일반 textarea에 Markdown으로 작성합니다. `.md` 파일을 브라우저에서 바로 불러올 수 있습니다.
- Preview를 누르면 서버의 공개 글과 같은 renderer와 sanitizer가 HTML을 만듭니다.
- `:::note{type="warning"}`처럼 `remark-directive` 문법을 사용할 수 있습니다. 지원하지 않거나 잘못 작성한 directive는 원문으로 표시되고 Preview에 경고가 나오지만 저장과 발행은 가능합니다.

본문은 UTF-8 기준 1MiB, 카테고리는 30개, 태그는 30개이며 태그 하나는 64글자까지 허용합니다. 검색은 검색어 200글자, 시리즈·카테고리·태그 각 20개, 태그 64글자, 작성자 아이디 30글자로 제한합니다. 잘못된 날짜나 상한을 넘긴 요청은 저장하거나 줄여서 해석하지 않고 400으로 거절합니다.

이미지는 선택 즉시 WebP로 줄여 R2에 업로드하고 현재 cursor에 Markdown URL을 넣습니다. 글의 정수 ID와 별개인 `assetId` UUID를 사용하며 key는 `posts/{assetId}/{imageId}.webp`입니다. Image list의 Delete는 R2 object를 즉시 삭제하지만 이미 작성한 Markdown은 바꾸지 않습니다. 화면을 떠나거나 글을 삭제할 때 이미지는 자동 정리하지 않으므로 필요 없는 이미지는 목록에서 직접 삭제합니다.

## 다국어와 시각

Paraglide가 한국어, 일본어, 영어 UI를 제공합니다. 언어 선택은 cookie에 저장하고 URL은 `/posts`처럼 한 벌만 사용합니다. 글 제목과 본문, 분류 이름은 번역하지 않습니다.

DB 시각은 UTC instant로 저장하고 HTML과 JSON-LD에는 ISO 8601을 사용합니다. 화면은 브라우저 locale과 timezone으로 표시합니다. 검색 날짜 범위와 보관함의 달력 경계는 `Asia/Seoul`입니다.

## 스키마 변경과 배포

Better Auth 설정을 바꾸면 공식 CLI로 schema를 생성해 diff를 검토하고, 콘텐츠 schema는 Drizzle migration으로 관리합니다.

Post와 카테고리·태그 관계는 한 D1 batch에서 저장합니다. 태그는 별도 lookup table 없이 `post_tags(post_id, tag)`에 저장합니다. 보호 페이지의 server load와 모든 변경 action은 각각 `requireUser()`를 먼저 호출합니다.

```bash
pnpm dlx auth@1.7.4 generate --config better-auth.config.ts --output generated-auth.ts --adapter drizzle --dialect sqlite --yes
pnpm db:generate
pnpm db:migrate:local
pnpm check
pnpm test
```

GitHub Actions는 검증 후 `main`에서만 운영 migration과 Worker 배포를 수행합니다. 저장소 secret `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`가 필요합니다. 수동 배포 순서는 다음과 같습니다.

```bash
pnpm db:migrate:remote
pnpm deploy
```

Post 편집 UI는 `src/lib/post-editor`, D1 조회와 저장 코드는 `src/lib/server/db/queries`에서 read/write 책임별로 찾을 수 있습니다. 기능별 첫 수정 위치를 보여 주는 상세 code map은 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)에 정리했습니다.
