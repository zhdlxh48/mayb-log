# mayb-log 구조

## 실행 구조

```text
Caddy (Raspberry Pi, TLS)
  → Synology LAN:3000
  → SvelteKit adapter-node app
      ├─ PostgreSQL 18 (Drizzle + Better Auth)
      └─ Garage 2.4.1 (S3 API)
```

`compose.yaml`은 `app`, `postgres`, `garage`만 실행합니다. 외부에는 app 포트만 공개하며 Caddy와 TLS는 NAS 밖에서 운영합니다. 앱 시작 시 `src/hooks.server.ts`의 `ServerInit`이 공식 Drizzle runtime migrator를 실행합니다. migration이 실패하면 초기화 오류가 그대로 전파되어 서버가 정상 기동하지 않습니다. PostgreSQL pool과 S3 client는 process 단위 singleton이며 `sveltekit:shutdown`에서 닫습니다.

## 코드 지도

```text
src/routes
  SvelteKit page, form action, HTTP endpoint
src/lib/post-editor
  보호된 Post 편집 UI와 편집기 전용 상태
src/lib/components
  여러 화면에서 사용하는 일반 UI
src/lib/validation
  application 입력 contract
src/lib/server/env.ts
  Node runtime 환경 변수
src/lib/server/auth
  Better Auth 설정, form 지원, 승인 guard
src/lib/server/db
  PostgreSQL pool, schema, migration, query와 transaction
src/lib/server/markdown
  서버 Markdown pipeline, directive, HTML 보안 정책
src/lib/server/media
  S3 client, WebP 검증, 목록과 object key 정책
tests/unit
  순수 로직과 server policy
tests/smoke
  실제 PostgreSQL/Garage/app browser integration
```

| 변경 대상                 | 첫 진입 파일                                    |
| ------------------------- | ----------------------------------------------- |
| runtime 환경 변수         | `src/lib/server/env.ts`                         |
| PostgreSQL 연결·migration | `src/lib/server/db/index.ts`                    |
| Post 조회                 | `src/lib/server/db/queries/posts/read.ts`       |
| Post 저장 transaction     | `src/lib/server/db/queries/posts/write.ts`      |
| Taxonomy 조회·선택지      | `src/lib/server/db/queries/taxonomy/read.ts`    |
| Taxonomy 저장·삭제        | `src/lib/server/db/queries/taxonomy/write.ts`   |
| 검색 URL/filter           | `src/lib/search.ts`                             |
| 검색 SQL                  | `src/lib/server/db/queries/search.ts`           |
| Post 일반 입력            | `src/lib/post-editor/PostMetadataFields.svelte` |
| Markdown 입력·Preview     | `src/lib/post-editor/PostBodyEditor.svelte`     |
| 이미지 UI                 | `src/lib/post-editor/ImageManager.svelte`       |
| S3 client와 목록          | `src/lib/server/media/{client,images}.ts`       |
| Markdown directive        | `src/lib/server/markdown/directives.ts`         |
| raw HTML·iframe 정책      | `src/lib/server/markdown/html-policy.ts`        |

barrel export, repository/DAO/service 계층 없이 route가 실제 기능 파일을 직접 import합니다.

## 요청과 인증

`src/hooks.server.ts`는 Paraglide와 Better Auth를 연결합니다. Better Auth는 PostgreSQL Drizzle adapter, `username()`, `captcha(...)`, `sveltekitCookies(...)`를 사용합니다. 120초 session cookie cache와 `user.approved` 승인 정책은 유지합니다. 보호 layout은 UI 편의일 뿐이며 각 mutation은 `requireUser()` 또는 `requireApiUser()`로 자체 승인 검사를 합니다.

모든 secret과 접속 정보는 `$env/dynamic/private`에서 runtime에 읽습니다. Docker image에는 secret이 포함되지 않습니다. `SITE_URL`과 adapter-node의 `ORIGIN`은 같은 canonical origin이어야 합니다.

## PostgreSQL

`src/lib/server/db/schema`는 table, column, constraint, index의 source of truth입니다. 콘텐츠 ID는 PostgreSQL `bigint GENERATED ALWAYS AS IDENTITY`이며 JS에서는 safe integer 범위의 `number`로 사용합니다. Post의 이미지 namespace인 `assetId`는 client가 발급하는 native `uuid`입니다. Post와 분류 관계 저장은 하나의 PostgreSQL transaction에서 처리하며 FK, UNIQUE, CHECK가 무결성 경계입니다. 없는 Post 수정은 `UPDATE ... RETURNING` 결과로 판별하고 Series 삭제는 Post의 `seriesId`와 `seriesPosition`을 같은 transaction에서 비웁니다.

목록과 sitemap은 본문을 읽지 않고 RSS는 최근 공개 글 30개만 읽습니다. Category/Tag는 PostgreSQL JSON aggregate로 구성합니다. 공개 상태는 `publishedAt` 하나로 판단합니다.

검색은 PostgreSQL extension인 `pg_trgm`과 query 표현식에 맞춘 trigram GIN index를 사용합니다. 3글자 이상은 제목·부제·설명·본문의 substring을 검색하고, 1~2글자는 제목·부제·설명만 검색합니다. Category/Tag 선택은 모든 선택값을 포함해야 하며 Series/Author/date filter와 함께 AND로 결합됩니다. 날짜 검색과 보관함 달력 경계는 `Asia/Seoul`입니다.

`drizzle/`은 versioned SQL과 Drizzle snapshot을 보관합니다. schema 변경은 `drizzle-kit generate`로 다음 diff migration을 만들고 SQL과 meta를 함께 commit합니다. 앱 시작 시 SvelteKit `ServerInit`이 `drizzle-orm/node-postgres/migrator`로 pending migration만 적용하며 실패하면 HTTP server가 정상 기동하지 않습니다.

## Markdown과 이미지

`render.ts`는 Preview, 공개 글, RSS가 공유하는 유일한 Markdown renderer입니다. GFM, `remark-directive`, raw HTML 처리, `rehype-sanitize`, highlight 순서를 유지합니다. `html-policy.ts`는 iframe 하나만 허용하는 raw HTML 정책과 sanitizer schema를 소유합니다. CSP와 sanitizer는 인프라 이식 전과 같은 정책입니다.

이미지 업로드는 MIME, 4MiB, WebP magic bytes를 검사한 뒤 AWS SDK v3 `PutObject`로 Garage에 저장합니다. 목록은 `ListObjectsV2` continuation token을 끝까지 따라가고 UUID WebP만 골라 LastModified와 key로 정렬합니다. 공개 route는 `GetObject` body를 web stream으로 전달하며 object 없음만 404로 바꿉니다. 편집기 다중 삭제는 `DeleteObjects`의 개별 오류도 실패로 처리합니다.

Garage endpoint와 PostgreSQL은 Docker network 내부에서만 접근합니다. 이미지 응답은 `Content-Type`, 1년 immutable cache, ETag를 유지합니다.

## UI, 국제화, SEO

공통 CSS와 Svelte scoped CSS, plain Markdown textarea 구조를 유지합니다. Paraglide의 한국어·일본어·영어 UI는 locale cookie를 사용하며 locale URL prefix는 없습니다. 저장 시각은 UTC instant이고 machine-readable 값은 ISO 8601, 보이는 값은 브라우저 timezone입니다.

`Seo.svelte`가 canonical, Open Graph, Twitter, BlogPosting을 만듭니다. sitemap은 noindex·임시·예약 글을 제외하고 RSS는 최근 공개 글 30개를 제공합니다. RSS/sitemap은 5분 cache header, 이미지는 immutable cache를 사용하며 HTML edge cache는 없습니다.

## 빌드와 운영 경계

`Dockerfile`은 Node 24 multi-stage build로 production dependency, adapter-node `build/`, `drizzle/`만 runtime image에 복사합니다. `compose.yaml`은 GHCR image를 사용하며 Synology에서 source build를 하지 않습니다. GitHub Actions는 production image를 한 번 build해 실제 PostgreSQL/Garage로 검증하고, 같은 image를 artifact로 publish job에 전달해 `main`과 source-revision SHA tag로 GHCR에 게시합니다. NAS, Caddy, DNS에는 접속하지 않습니다.

PostgreSQL 18 데이터는 `${DATA_ROOT}/postgres`를 container의 `/var/lib/postgresql`에 mount합니다. Garage metadata와 object data는 `${DATA_ROOT}/garage/{meta,data}`에 분리합니다. single-node Garage와 단일 SSD는 redundancy가 아니므로 PostgreSQL, Garage metadata/object, `.env`를 별도 장치나 원격 위치에 일관되게 백업해야 합니다.
