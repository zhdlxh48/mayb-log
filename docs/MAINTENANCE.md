# 유지보수 가이드

## 구조

```text
src/
  index.js            요청 진입점, 오류와 R2 응답
  routes-public.js    공개 페이지, 검색, RSS, Sitemap
  routes-auth.js      회원가입, 로그인, 로그아웃, 계정
  routes-admin.js     글 편집, 사용자 관리, 이미지 업로드
  auth.js             PBKDF2, 세션, CSRF, Turnstile, rate limit
  data.js             D1 공개 조회와 검색
  markdown.js         Marked 저장 시 변환
  views.js            공통 semantic HTML
  lib.js              짧은 공통 함수
  vendor/             Worker용 Marked
public/                CSS와 브라우저 vendor/script
migrations/            순서대로 적용하는 D1 schema/data
seed/media/            기존 샘플 R2 파일
```

요청은 `index.js`에서 로그인 세션과 상단 메뉴 데이터를 읽은 뒤 해당 route로 전달됩니다. 공개 글 route는 Markdown을 변환하지 않고 D1의 `body_html`을 출력합니다. 저장 route만 `markdown.js`를 호출합니다.

## 변경 위치

- 공개 URL이나 목록: `routes-public.js`
- 로그인 정책: `auth.js`, `routes-auth.js`
- 글 필드·권한: `routes-admin.js`, 새 D1 migration
- 공통 문서 구조: `views.js`
- 스타일: `public/site.css`
- 검색 대상: `data.js`의 `searchData`
- DB schema: 기존 파일 수정 대신 `migrations/0003_설명.sql`처럼 추가

Category와 Tag는 콘텐츠 JSON 배열로 유지합니다. 데이터가 커져 실제 측정에서 부분 문자열 검색이 느려질 때 D1 FTS5를 검토하세요. 그 전에는 검색 추상화나 cache invalidation 계층을 추가할 필요가 없습니다.

## Git 작업 예

```bash
git switch main
git pull --ff-only
git switch -c feature/example
# 구현, 검사, commit
git switch dev
git merge --no-ff feature/example
# 통합 검사
git switch feature/example
git merge main
git switch main
git merge --no-ff feature/example
```

hotfix는 최신 `main`에서 `hotfix/*`로 만들고 `main`과 `dev`에 각각 병합합니다. 글·분류 수정은 `content/*`에서 검증한 뒤 `main`에 직접 병합합니다.

## 의존성과 vendor 갱신

Wrangler와 Playwright만 개발 의존성입니다. 버전을 바꾼 뒤 전체 검사를 실행합니다. 브라우저 라이브러리는 npm 의존성으로 추가하지 말고 공식 release tarball의 배포 파일을 교체한 뒤 [VENDOR.md](VENDOR.md)의 버전과 라이선스를 갱신합니다. Worker Marked와 브라우저 Marked는 항상 같은 정확한 버전이어야 합니다.

## 장애 확인

1. GitHub Actions의 `verify`에서 처음 실패한 명령을 로컬에서 재현합니다.
2. D1 오류는 `wrangler d1 migrations list mayb-log --remote`와 `wrangler tail`을 확인합니다.
3. 배포 오류는 API token의 Worker/D1/R2 권한과 account ID를 확인합니다.
4. 로그인 오류는 Turnstile hostname/action, secret, 사용자 `status`를 확인합니다. 비밀번호·세션 원문·CSRF·secret은 로그에 남기지 않습니다.
5. 잘못된 배포는 이전 정상 Git commit을 새 hotfix branch에서 되돌려 동일한 검사를 거쳐 배포합니다. D1 migration은 역방향 SQL을 새 migration으로 작성합니다.

PBKDF2 정책은 OWASP 기준인 HMAC-SHA-256 600,000회입니다. 로그인 CPU 시간이 Cloudflare 계정 한도를 넘으면 먼저 Workers 유료 플랜과 실제 CPU 측정을 확인하세요. iteration을 임의로 낮추지 않습니다.
