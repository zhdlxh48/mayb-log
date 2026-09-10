# mayb-log

SvelteKit으로 만든 개인 블로그입니다. Cloudflare Workers에서 실행하며 D1에 계정과 글을, R2에 이미지를 저장합니다.

## 기술 구성

- SvelteKit 2.70.3, Svelte 5.57.0, TypeScript 6.0.3
- Better Auth 1.7.3, Drizzle ORM 0.45.2
- Superforms 2.30.2, Zod 4.5.4
- Carta 4.11.2, browser-image-compression 2.0.2
- Pico CSS 2.1.1, unified/remark/rehype, feed
- Cloudflare Workers, D1, R2, Wrangler 4.130.0

기존 Express/EJS 앱과 데이터는 가져오지 않았습니다. 새 앱은 새 D1과 R2에서 시작합니다.

## 로컬 실행

Node 24.20.0과 pnpm 11.25.0을 사용합니다.

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

`.dev.vars`의 `BETTER_AUTH_SECRET`은 32자 이상의 임의 문자열로 바꿉니다. 로컬 테스트에는 Cloudflare의 Turnstile 테스트 키를 사용할 수 있습니다.

자주 쓰는 명령은 다음과 같습니다.

```bash
pnpm format:check
pnpm lint
pnpm check
pnpm test:unit
pnpm test:smoke
pnpm build
pnpm preview
```

`test:smoke`는 로컬 D1에 가입 action으로 임시 사용자를 만든 뒤 승인 상태만 SQL로 바꿉니다. 테스트가 끝나면 해당 사용자와 글을 삭제합니다. 비밀번호 해시는 직접 만들지 않습니다.

## Cloudflare 리소스

- Worker: `mayb-log-sveltekit`
- D1: `mayb-log-sveltekit-db` (`f2b34fea-46ec-4273-b506-0f3a1c20dcc1`)
- R2: `mayb-log-sveltekit-media`
- URL: `https://mayb-log-sveltekit.mayb.workers.dev`

필요한 Worker secrets는 다음 두 개입니다.

```text
BETTER_AUTH_SECRET
TURNSTILE_SECRET_KEY
```

공개 설정인 `SITE_URL`, `TURNSTILE_SITE_KEY`는 [wrangler.jsonc](./wrangler.jsonc)에 있습니다. 이메일 발송 서비스는 사용하지 않습니다.

스키마를 바꿀 때는 다음 순서를 지킵니다.

```bash
# Better Auth 설정을 바꾼 경우 auth schema를 먼저 다시 생성하고 검토
pnpm dlx auth@1.7.3 generate --config better-auth.config.ts --output src/lib/server/db/schema/auth.ts --adapter drizzle --dialect sqlite --yes
pnpm db:generate
pnpm db:migrate:local
pnpm check
pnpm test
```

생성된 migration을 검토한 뒤 `pnpm db:migrate:remote`로 새 운영 D1에 적용합니다.

## 첫 계정과 운영

1. `/signup`에서 아이디, 닉네임, 이메일, 비밀번호로 가입합니다.
2. 운영 D1에서 그 계정의 `approved`를 `1`로 바꿉니다.
3. 필요하면 첫 운영자의 `role`도 `admin`으로 바꿉니다.
4. `/login`에서 로그인합니다.

Windows를 포함해 저장소 루트에서 다음 명령으로 승인할 수 있습니다.

```bash
node node_modules/wrangler/bin/wrangler.js d1 execute DB --remote --command "UPDATE user SET approved = 1 WHERE username = 'your_id';"
```

첫 운영자 역할도 필요하면 다음과 같이 설정합니다.

```bash
node node_modules/wrangler/bin/wrangler.js d1 execute DB --remote --command "UPDATE user SET role = 'admin' WHERE username = 'your_id';"
```

계정 정지는 Better Auth Admin plugin의 `banUser` API를 사용합니다. 콘텐츠 권한은 role과 관계없이 **승인된 모든 사용자**에게 같습니다. 다른 사용자가 글을 수정해도 최초 작성자는 바뀌지 않습니다.

아이디와 이메일은 가입 후 바꿀 수 없습니다. 닉네임과 비밀번호는 `/profile`에서 변경합니다. 이메일은 현재 계정 정보로만 저장하며 인증 메일을 보내지 않습니다. 비밀번호를 잊었을 때 이메일 재설정 기능은 없으므로 운영자가 계정을 삭제한 뒤 다시 가입하거나 D1을 직접 관리해야 합니다.

## 글 작성

- Series와 Category는 각각의 목록에서 만든 뒤 글 편집 화면에서 선택합니다.
- Tag는 쉼표로 구분해 입력합니다. 공백과 중복은 저장할 때 정리됩니다.
- 이미지는 Carta 편집기에 붙여 넣거나 첨부합니다. 브라우저에서 WebP, 최대 1600px로 줄인 뒤 R2에 저장합니다.
- **Save draft**는 공개하지 않고 편집 화면으로 돌아옵니다. `/drafts`에서 다시 찾을 수 있습니다.
- **Publish**는 현재 시각 또는 지정 시각에 공개합니다. 미래 시각이면 예약 글로 `/drafts`에 남습니다.
- **No index**를 켜면 글은 공개되고 검색과 RSS에도 나오지만 검색엔진 sitemap에서는 빠지고 `noindex` 메타가 붙습니다.

글을 삭제해도 R2 이미지는 자동 삭제하지 않습니다. 같은 이미지를 다른 글에서 쓸 수 있기 때문입니다. 편집기의 Attached media 목록에서 필요 없는 object를 직접 삭제할 수 있습니다.

## 배포

GitHub Actions는 모든 브랜치에서 format, lint, type check, unit test, 로컬 migration, Chromium smoke, build를 실행합니다. `main`에서 모두 통과하면 새 D1 migration을 적용하고 `mayb-log-sveltekit` Worker를 배포합니다. 저장소 secret에는 `CLOUDFLARE_API_TOKEN`과 `CLOUDFLARE_ACCOUNT_ID`가 필요합니다.

수동 배포는 다음과 같습니다.

```bash
pnpm db:migrate:remote
pnpm deploy
```

구조와 수정 지점은 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)에 정리했습니다.
