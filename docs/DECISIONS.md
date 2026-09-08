# 결정 기록

- Cloudflare Worker가 유일한 HTTP 서버이며 D1, R2, Static Assets를 직접 사용한다.
- Markdown은 저장 시 Marked 18.0.12로 HTML·텍스트로 변환한다. 공개 요청은 저장된 HTML만 읽는다.
- 일반 작성자의 raw HTML은 escape한다. 자체 sanitizer와 admin raw HTML 예외는 만들지 않는다.
- 세션은 256-bit opaque token, D1 SHA-256 hash, 7일 고정 만료를 사용한다.
- PBKDF2-HMAC-SHA-256 600,000회와 사용자별 16-byte salt를 사용한다.
- 목록 썸네일과 비밀번호 변경/초기화는 v1에서 제외한다.
- Category/Tag는 JSON 배열, 검색은 D1 부분 문자열 방식으로 시작한다.
- Dynamic HTML cache와 별도 JSON API는 측정 결과가 필요할 때만 추가한다.
- 이전 Astro 샘플은 D1/R2 seed로 이전하고 MDX/LinkPreview/iframe은 일반 Markdown 링크로 바꾼다.
