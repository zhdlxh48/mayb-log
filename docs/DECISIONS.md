# 최종 결정 기록

- Cloudflare Workers + Express + EJS + D1 + R2 + Static Assets를 유지한다. Astro, Tailwind, React, JWT, 관리자·역할·Pages·Tag 테이블·이미지 테이블·slug를 추가하지 않는다.
- 공개 GET은 세션 D1 조회를 하지 않는다. Navigation은 session 쿠키 존재 여부만 보고 Login/Profile을 표시한다.
- 브라우저 쿠키는 7일 session 하나다. `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`를 사용한다. CSRF token은 D1 session row에만 두고 보호된 EJS form의 hidden input으로 전달한다. 변경 POST는 active session, token 일치, exact Origin을 확인한다.
- PBKDF2-HMAC-SHA-256은 사용자별 16-byte salt와 100,000 iteration을 사용한다. 기존 row 검증에는 그 row의 `password_iterations`를 쓴다. 로그인은 없는 계정에도 fake record 계산을 수행한다.
- active 사용자는 모든 글·Series·Category를 편집할 수 있다. 글 최초 작성자는 다른 사용자가 고쳐도 유지한다.
- Markdown 일반 링크와 이미지는 Marked 기본 출력을 사용한다. 서버 raw HTML은 escape하고 HTTP/HTTPS iframe만 `sanitize-html`로 허용 속성을 제한한다. Preview는 의도적으로 sanitize하지 않는다.
- 검색은 20개씩 SQL에서 페이지 처리한다. Series는 OR, Category와 Tag는 각각 AND다. 세 글자 이상은 contentless trigram FTS5, 짧은 검색은 escaped LIKE를 사용한다. To 날짜는 서울 시간 기준 해당 날짜 전체를 포함한다.
- 모든 runtime D1 SQL은 실행 쿼리별 `.sql` 파일이다. JS는 import, bind, batch, 결과 변환만 담당한다. FTS 동기화는 trigger 없이 글 변경 코드에서 명시한다.
- R2 key는 `posts/{post_uuid}/{image_uuid}.webp`다. R2가 이미지 목록의 기준이며 D1 이미지 테이블은 없다.
- 정보 밀도가 높은 native control 중심 화면을 유지한다. card, pill, shadow, gradient, 큰 radius를 사용하지 않는다.
