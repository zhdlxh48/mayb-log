# mayb-log

Cloudflare Workers가 HTML을 만들고 D1에 글과 사용자를 저장하는 작은 개인 블로그입니다. 글은 Markdown으로 작성하며 저장할 때 안전한 HTML과 검색 텍스트로 변환됩니다. 공개 요청에서는 저장된 HTML을 바로 사용합니다.

## 로컬 실행

Node.js 24.20.0과 pnpm 11.25.0을 사용합니다.

```bash
pnpm install --frozen-lockfile
copy .dev.vars.example .dev.vars
pnpm db:local
pnpm seed:media:local
pnpm dev
```

Wrangler가 표시한 로컬 주소를 엽니다. `.dev.vars.example`의 키는 Cloudflare 공식 테스트 키이며 운영에 사용하면 안 됩니다.

## 검사

```bash
pnpm check
pnpm test
pnpm test:integration
pnpm build
pnpm test:browser
```

`test:integration`은 로컬 Worker와 D1을 사용해 인증·CSRF·권한을 검사합니다. 브라우저 검사는 Chromium, Firefox, WebKit에서 실행됩니다.

## 첫 관리자 만들기

자동 관리자나 초기 비밀번호는 없습니다.

1. `/signup`에서 일반 회원가입을 합니다. 계정은 `pending/author`로 생성됩니다.
2. 로컬에서는 다음 명령으로 최초 관리자만 활성화합니다.

```bash
pnpm exec wrangler d1 execute mayb-log --local --command "UPDATE users SET status='active', role='admin' WHERE username='내아이디'"
```

3. 운영에서는 `--local`을 `--remote`로 바꿉니다.
4. 이후 가입 승인은 `/admin/users`에서 처리합니다.

## Cloudflare 최초 설정

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create mayb-log
pnpm exec wrangler r2 bucket create mayb-log-media
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
```

D1 생성 결과의 `database_id`를 `wrangler.jsonc`에 넣습니다. Cloudflare Turnstile에서 위젯을 만들고 사이트 키를 `TURNSTILE_SITE_KEY`, 허용 hostname과 실제 주소를 `SITE_ORIGIN`에 설정합니다. 그런 다음 실행합니다.

```bash
pnpm db:remote
pnpm seed:media:remote
pnpm deploy
```

GitHub Actions 자동 배포에는 저장소 Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TURNSTILE_SECRET_KEY`가 필요합니다. API token에는 Worker 배포, D1 편집, R2 편집 권한을 부여합니다. workflow의 `Set Worker secret` 단계가 `TURNSTILE_SECRET_KEY`를 매 배포에 반영합니다. 위 `wrangler secret put` 명령은 수동으로 최초 배포할 때 사용합니다.

자세한 글 작성법은 [콘텐츠 가이드](docs/CONTENT_GUIDE.md), 구조와 장애 대응은 [유지보수 가이드](docs/MAINTENANCE.md)를 참고하세요.
