# Cloudflare Workers 전환 구현 보고서

이 문서는 구현과 배포 근거를 기록합니다. 최종 GitHub Actions 결과와 main SHA는 마지막 병합 후 보고합니다.

1. **기준:** `main`의 `a68a05145c3ea5ff4628b32ceab3c922a7067370`, 작업 branch `feature/cloudflare-workers-migration`.
2. **제거:** Astro, 모든 `@astrojs/*`, Tailwind, MDX, astro-embed, FlexSearch, Sharp, remark/rehype 관련 코드와 Content Collections 구조.
3. **구조:** Worker route 3개, 인증·조회·Markdown·view·공통 모듈, D1 migrations, Static Assets, R2 seed로 구성.
4. **D1:** `users`, `sessions`, `series`, `content`와 실제 FK/check/index를 `0001_initial.sql`에 정의.
5. **계정 상태:** signup은 `pending/author`; active만 로그인; inactive 전환 시 session 삭제; 마지막 active admin의 비활성화·강등 차단.
6. **첫 관리자:** signup 후 Wrangler/D1에서 한 번만 `status='active', role='admin'`으로 갱신.
7. **비밀번호:** Web Crypto PBKDF2-HMAC-SHA-256, random 16-byte salt, 600,000회, 성공 로그인 시 낮은 iteration 재해시. 로컬 Node 측정 74~76ms.
8. **Turnstile:** 로그인·가입 화면에서 공식 script/action을 사용하고 POST에서 Siteverify success/hostname/action을 확인. 공식 테스트 키만 local 예외 적용.
9. **세션:** 256-bit raw token은 cookie에만 두고 D1에는 SHA-256만 저장. HttpOnly/Secure/SameSite=Strict/Path=/, 7일 만료, CSRF token과 exact Origin 검사.
10. **작성 권한:** 신규 글의 `author_user_id`는 현재 session에서 정하고 client 값은 무시. author는 자기 글만, admin은 모두 수정 가능.
11. **Markdown/Prism:** Marked 18.0.12 Worker·browser 버전 일치, raw HTML escape, unsafe URL 차단, fence language class와 Prism 1.30.0 구성.
12. **이미지 압축:** browser-image-compression 2.0.2, Web Worker, WebP, quality 0.82, 긴 변 1600px. 2400×1800 생성 sample은 Chromium에서 89,762B → 3,976B, WebKit에서 21,388B → 3,976B인 1600×1200 WebP로 변환됨.
13. **R2:** 인증·CSRF·5MB·MIME·magic bytes 검사 후 `media/{user_id}/{yyyy}/{uuid}.{ext}` 저장, 공개 응답은 1년 immutable cache.
14. **검색:** D1 `LIKE ... ESCAPE '\\'`에 NFKC lowercase 검색 텍스트 사용. All은 종류별 10개, 필터는 20개/페이지와 고정 10-page group. htmx outerHTML 교체와 일반 GET을 함께 제공.
15. **검증:** Node unit 6개, 실제 local Worker/D1 인증 통합 시나리오, Chromium/WebKit 브라우저 각 3개 통과. 로컬 Firefox는 Windows side-by-side runtime 오류로 실행되지 않아 GitHub Actions 결과를 기다림.
16. **migration:** 로컬과 APAC 원격 D1 `f429e531-8485-4981-a0e9-0545cba677a8`에 `0001_initial.sql`, `0002_sample_content.sql` 적용 성공. 원격 결과는 users 1, content 4, series 1, migrations 2이며 R2 sample도 업로드·다운로드 확인.
17. **배포:** Worker version `c7bd1cc9-7098-4afa-81d2-775d9736f6bb`을 `https://mayb-log.mayb.workers.dev`에 배포. 공개·분류·검색·feed·media·auth form·404 경로와 canonical/JSON-LD/Prism을 운영 환경에서 확인.
18. **미완료:** GitHub Actions 운영 배포용 scoped Cloudflare API token secret과 최종 main CI. 사용자의 첫 signup/관리자 승격. 목록 썸네일과 비밀번호 변경은 허용된 v1 제외 항목.
