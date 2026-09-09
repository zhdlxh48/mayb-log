# mayb-log

Cloudflare Workers에서 실행되는 개인 블로그다. Express가 요청을 처리하고 EJS가 HTML을 만들며, 글과 계정은 D1에, 글 이미지는 R2에 저장한다. 화면은 plain CSS와 작은 vanilla JavaScript로 동작한다.

## 준비

- Node.js 24.20.0
- pnpm 11.25.0
- Cloudflare 계정과 Wrangler 로그인

```bash
pnpm install
pnpm db:local
pnpm seed:local
pnpm dev
```

로컬 주소는 Wrangler가 출력한다. 개발 seed의 로그인은 `testuser` / `test-password-1234`이며 운영에는 사용하지 않는다.

## 명령

```bash
pnpm format          # 소스와 SQL 자동 정리
pnpm format:check    # 포맷 검사
pnpm lint            # ESLint 검사
pnpm lint:fix        # ESLint 자동 수정
pnpm test:unit
pnpm test:repository
pnpm test:integration
pnpm build           # Worker dry-run build
pnpm test:browser    # Chromium, Firefox, WebKit
pnpm db:remote       # 운영 D1 migration
pnpm deploy          # Worker 배포
```

통합·브라우저 테스트는 Cloudflare 공식 Turnstile 테스트 키를 실행 인자로 사용한다. 루트 `.dev.vars`를 만들거나 바꾸지 않는다.

## 운영

`main` push 시 GitHub Actions가 포맷, 린트, 단위·저장소·통합·브라우저 테스트와 dry-run build를 실행한 뒤 D1 migration과 Worker 배포를 수행한다. 운영 주소는 [mayb-log.mayb.workers.dev](https://mayb-log.mayb.workers.dev/)다.

회원가입 계정은 `pending`으로 생성된다. 운영자가 Cloudflare D1 Console에서 확인한 계정만 다음처럼 활성화한다.

```sql
UPDATE users SET status = 'active', updated_at = unixepoch() WHERE username = '확인한_아이디';
```

콘텐츠 작성은 [콘텐츠 가이드](docs/CONTENT_GUIDE.md), 구조와 장애 대응은 [유지보수 가이드](docs/MAINTENANCE.md), 선택한 정책은 [결정 기록](docs/DECISIONS.md)을 참고한다.

## Git 흐름

기능 브랜치는 최신 `main`에서 만든다. 작업을 Conventional Commits 형식으로 커밋한 뒤 작업 브랜치를 `dev`에 `--no-ff`로 병합한다. 최신 `main`을 작업 브랜치에 병합해 검증하고, 작업 브랜치를 `main`에 직접 `--no-ff`로 병합한다. 긴급 수정은 `hotfix/*`, 콘텐츠만 바꾸는 작업은 `content/*`를 사용한다.
