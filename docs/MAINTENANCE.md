# 유지보수 가이드

## 요청 흐름

`src/worker.js`가 Cloudflare의 Node HTTP handler로 Express 앱을 실행한다. `src/app.js`는 보안 헤더와 route를 연결하고, `src/routes/`가 입력 검증과 흐름을 담당한다. `src/db/*.js`는 `src/db/queries/**/*.sql`을 import해 D1에 bind한다. `src/render.js`는 `views/`의 EJS를 미리 compile한다. `public/`에는 CSS, 작은 화면 스크립트, 검증된 vendor 파일만 있다.

공개 route에는 `loadSession`을 붙이지 않는다. 인증이 필요한 GET/POST만 `loadSession`, `requireActive`를 사용하고 변경 POST는 `requireCsrf`까지 사용한다. 보호된 새 form에는 `<input type="hidden" name="csrf" value="<%= user.csrf_token %>">`를 넣는다. CSRF cookie나 `document.cookie` 읽기를 다시 만들지 않는다.

## 기능 변경

- route: 해당 `src/routes/<domain>.js`
- D1 query: 실행 단위로 `src/db/queries/<domain>/*.sql` 추가 후 해당 db module에서 import
- 화면: `views/<domain>/` 또는 `views/partials/`
- 공통 스타일: `public/site.css`
- Markdown 저장 정책: `src/services/markdown.js`
- 이미지 정책: `src/services/images.js`, `public/image-editor.js`
- 검색 입력: `src/search.js`; 쿼리: `src/db/queries/search/`

SQL에는 `SELECT *`를 쓰지 않는다. 쿼리 변경 후 `pnpm format`, `pnpm test:repository`, `pnpm test:integration`을 실행한다. 인증·이미지·검색 변경은 해당 브라우저 테스트도 실행한다.

## 계정과 데이터

회원가입은 `pending`이다. 본인 확인 후 D1에서 `active`로 바꾼다. `password_iterations`가 100000을 넘는 오래된 테스트 계정은 삭제하거나 새 해시로 교체하되 실제 사용자 계정은 임의로 삭제하지 않는다. 운영 secret은 Cloudflare secret과 GitHub Actions secret에만 둔다.

이미지 업로드는 6개 × 4MiB가 상한이다. R2 정리 실패는 글 저장을 되돌리지 않고 로그에 남는다. 고아 이미지는 post UUID prefix를 확인해 수동 삭제한다.

## 배포 실패 대응

GitHub Actions의 verify 실패 단계부터 재현한다. 포맷은 `pnpm format`, 린트는 `pnpm lint:fix`로 고친 뒤 해당 테스트를 다시 실행한다. D1 migration 실패 시 적용 목록과 SQL을 확인하고, 이미 적용된 migration 파일을 수정하지 말고 새 번호의 migration을 추가한다. Worker 배포 실패 시 `pnpm build`와 Wrangler 인증·binding을 확인한다. 긴급 운영 오류는 최신 `main`에서 `hotfix/*`를 만들고 검증 후 `main`과 `dev`에 각각 병합한다.

Cloudflare 장애 시 배포 로그의 Worker version을 확인해 정상 버전으로 rollback하고, DB schema가 함께 바뀌었다면 호환 여부를 먼저 확인한다.
