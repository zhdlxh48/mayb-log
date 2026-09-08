# 유지보수 가이드

## 요청 흐름

`src/worker.js`가 Express를 Workers `node:http` handler에 연결합니다. `src/app.js`는 공통 보안 헤더와 라우트를 조립합니다. 각 `src/routes/*.js`에서 입력과 응답 흐름을 읽을 수 있고, 실제 SQL은 `src/db/*.js`에 그대로 있습니다. `src/render.js`는 Wrangler가 text module로 포함한 실제 `views/*.ejs`를 시작 시 한 번 컴파일합니다.

공개 GET 라우트에는 session middleware를 연결하지 않습니다. Navigation의 Login/Profile은 session cookie 존재 여부만 봅니다. `/profile`, 작성·편집 화면과 모든 변경 POST에서만 D1 session과 active 상태를 검증합니다.

## 데이터

- `posts.id`: 공개 URL과 관계 키
- `posts.uuid`: `posts/{post_uuid}/` R2 namespace
- `post_fts`: 저장할 때 명시적으로 동기화하는 파생 검색 인덱스
- Series: 글 하나에 0개 또는 1개
- Categories: `post_categories`로 여러 개
- Tags: `posts.tags` JSON 배열

스키마를 바꿀 때 기존 migration 파일을 수정하지 말고 새 번호의 SQL을 추가합니다. 로컬에서 `pnpm db:local`과 통합 테스트를 먼저 통과시킨 뒤 `main` 배포가 remote migration을 적용하게 합니다.

## 검색

`src/db/search.js`가 검색의 단일 기준입니다. 3글자 이상은 contentless trigram FTS5, 1~2글자는 escaped LIKE를 사용합니다. 반복 Series는 OR, 반복 Category와 Tag는 각각 AND이며 그룹 사이는 AND입니다. 필터·정렬·20개 pagination은 전부 SQL에서 처리합니다.

## 계정과 보안

가입 계정은 기본 `pending`입니다. 활성화와 비활성화는 D1 Console에서 처리합니다.

```sql
UPDATE users SET status = 'active', updated_at = unixepoch() WHERE username = 'mayb';
UPDATE users SET status = 'inactive', updated_at = unixepoch() WHERE username = 'mayb';
```

모든 active 사용자는 같은 편집 권한을 가집니다. `author_user_id`는 최초 작성자 표시에만 쓰며 편집해도 바뀌지 않습니다. 세션 raw token은 HttpOnly cookie에만 있고 D1에는 SHA-256 hash가 저장됩니다. 변경 POST는 active session, CSRF token, 정확한 Origin을 모두 확인합니다.

## 장애 확인

1. GitHub Actions의 verify 실패 단계부터 확인합니다.
2. migration 실패면 D1 migration 상태와 해당 SQL을 확인합니다.
3. 이미지 문제면 R2의 `posts/{post_uuid}/` prefix와 Markdown URL을 비교합니다.
4. 검색 누락이면 `posts`와 `post_fts`의 같은 rowid를 확인합니다.
5. 배포 실패면 Cloudflare API token의 Workers Scripts, D1, R2 권한과 Worker secret을 확인합니다.

의존성은 한 번에 하나씩 갱신하고 전체 검사를 다시 실행합니다. 새 기능은 기존 route, DB 함수, EJS 화면 중 실제로 필요한 위치에만 추가합니다.
