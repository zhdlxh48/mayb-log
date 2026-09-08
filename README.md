# mayb-log

Cloudflare Workers에서 실행되는 작은 개인 블로그입니다. Express가 요청을 처리하고, D1의 데이터를 실제 EJS 템플릿으로 렌더링합니다. 게시글 이미지는 R2에 저장하며 CSS와 브라우저 JavaScript는 Workers Static Assets가 제공합니다.

## 준비

- Node.js 24.20.0
- pnpm 11.25.0
- Cloudflare 계정과 Wrangler 로그인

```powershell
pnpm install --frozen-lockfile
pnpm db:local
pnpm seed:local
pnpm dev
```

로컬 주소는 `http://127.0.0.1:8787`입니다. 개발용 계정은 `testuser` / `test-password-1234`이며 로컬·테스트 데이터에만 사용합니다.

## 확인

```powershell
pnpm check
pnpm test
pnpm test:integration
pnpm build
pnpm test:browser
```

CI는 설치, 소스 검사, 단위 테스트, 로컬 D1 migration과 seed, 통합 테스트, Worker dry-run, Chromium·Firefox·WebKit 검증 순서로 실행됩니다.

## 배포

`main` push가 CI를 모두 통과하면 GitHub Actions가 D1 migration을 적용하고 Worker를 배포합니다. 샘플 데이터와 이미지는 배포 때마다 넣지 않습니다.

Cloudflare 리소스를 새로 만들었을 때 한 번만 다음 값을 준비합니다.

- `wrangler.jsonc`의 D1 `database_id`와 R2 bucket
- Worker secret `TURNSTILE_SECRET_KEY`
- GitHub Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

콘텐츠 작성법은 [콘텐츠 가이드](docs/CONTENT_GUIDE.md), 구조와 운영법은 [유지보수 가이드](docs/MAINTENANCE.md)를 참고하세요. 최종 기준은 [최종 수정 지시서](docs/FINAL_REFACTOR_INSTRUCTIONS.txt)입니다.
