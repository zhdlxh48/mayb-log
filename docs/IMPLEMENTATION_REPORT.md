# 최종 감사 수정 구현 보고서

## 기준

- 시작 `main`: `bc0ed7947e20096f90eb72bd66fc5980a9323879`
- 작업 브랜치: `feature/final-audit-cleanup`
- 기준 문서: `docs/FINAL_AUDIT_FIX_INSTRUCTIONS.txt`
- 런타임: Express 5.2.1, EJS 6.0.1, Marked 18.0.12, Multer 2.3.0, sanitize-html 2.17.7
- 도구: ESLint 10.10.0, Prettier 3.9.6, prettier-plugin-ejs 1.0.3, sql-formatter 15.8.2, Husky 9.1.7, lint-staged 17.5.0

## 구현 결과

1. Cloudflare Workers, Express, EJS, D1, R2, Static Assets 구조와 공개 GET의 session D1 조회 0 원칙을 유지했다.
2. CSRF cookie와 frontend cookie 읽기를 제거했다. session 쿠키는 `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`이며, 보호된 form은 D1 session row의 CSRF 값을 hidden input으로 보낸다. 변경 POST는 exact Origin도 검사한다.
3. 유효하지 않은 session을 보호된 route에서 확인하면 session cookie를 즉시 만료한다.
4. PBKDF2를 100,000회로 통일하고 row별 iteration 검증을 유지했다. 없는 계정은 고정 fake record로 같은 계산을 수행한다.
5. Signup에 비밀번호 확인과 두 비밀번호 필드를 함께 전환하는 표시 checkbox를 추가했다.
6. 공개 글 상세는 Edit만 표시한다. 글 삭제는 편집 화면, Series·Category 삭제는 각 편집 화면에서 hidden CSRF와 외부 `site.js` confirm으로 수행한다.
7. Marked의 일반 링크·이미지 출력을 사용한다. 서버는 일반 raw HTML을 escape하고 HTTP/HTTPS iframe만 허용 속성으로 sanitize한다. client preview는 의도적으로 sanitize하지 않는다.
8. CSP는 inline script 없이 외부 HTTP/HTTPS Markdown 이미지와 iframe을 허용한다.
9. Posts와 Search가 같은 pagination partial을 사용한다. 한 페이지여도 `<< < 1 > >>`을 보이며 10-page block과 실제 마지막 페이지를 사용한다. 범위 밖 page는 filter를 보존한 canonical URL로 303 이동한다.
10. Search To 날짜를 서울 시간 다음 날 00:00 미만으로 처리하고 Archive link에는 실제 월 마지막 날을 표시한다.
11. 모든 runtime D1 SQL을 `src/db/queries/`의 실행 쿼리별 파일로 옮겼다. Wrangler native `.sql` import가 dry-run에서 동작해 custom rule은 추가하지 않았다. `SELECT *`는 없다. Post update의 사전 조회는 id와 uuid만 읽는다.
12. 이미지 정책은 R2 source of truth를 유지하고 Multer 상한을 6개 × 4MiB로 줄였다.
13. EJS를 layouts, common/posts partials, 도메인 폴더로 옮기고 이전 flat view를 제거했다.
14. Prettier/EJS, ESLint flat config, SQL formatter, lint-staged, Husky를 추가했다. pre-commit은 staged format과 JS lint fix, pre-push는 lint만 실행한다.
15. 테스트를 unit, repository, integration, browser와 helpers로 분리했다. `scripts/`의 check·integration test를 제거했고 integration은 `.dev.vars`를 만들지 않으며 1개씩 독립 초기화한다.
16. 화면 글꼴·여백·행·표·폼·pagination을 줄이고 nav를 하나의 왼쪽 cluster로 만들었다. card, pill, shadow, gradient를 사용하지 않는다.
17. 글 JSON-LD에 `dateModified`를 추가하고 Twitter card/title/description metadata를 복구했다.
18. CI는 install → format check → lint → unit → repository → local migration → seed → integration → dry-run build → Chromium/Firefox/WebKit 순서로 검증하며 `main`에서만 remote migration과 배포를 수행한다.

## 검증 기록

최종 commit, GitHub Actions 실행, production Worker version, GitHub repository 설명과 Pages 비활성 상태는 병합·배포 후 이 대화의 최종 보고에 실제 값으로 기록한다. 실제 Safari 기기는 없으며 Playwright WebKit으로 회귀 검증한다.
