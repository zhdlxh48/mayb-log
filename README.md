# mayb-log

SvelteKit으로 만든 개인 블로그입니다. Node 24 서버를 Docker로 실행하며 PostgreSQL에 계정과 글을, Garage의 S3 API에 이미지를 저장합니다. 운영 주소는 `https://blog.mayb.moe`입니다.

## 기술 구성

- SvelteKit 2, Svelte 5, TypeScript, `@sveltejs/adapter-node`
- Better Auth, Drizzle ORM, PostgreSQL 18
- Garage 2.4.1, AWS SDK v3
- unified/remark/rehype, Paraglide, Superforms, Zod
- Docker Compose, GHCR, 외부 Caddy reverse proxy

CSS framework와 client Markdown renderer는 사용하지 않습니다. 공통 스타일은 `src/global.css`, 화면별 스타일은 Svelte 컴포넌트의 `<style>`에 둡니다.

## 로컬 개발

Node 24.20.0, pnpm 11.25.0, Docker Compose v2를 사용합니다.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose -f compose.test.yaml up -d postgres garage
pnpm dev
```

호스트에서 `pnpm dev`를 실행할 때 `.env`의 `PGHOST`는 `127.0.0.1`, `S3_ENDPOINT`는 `http://127.0.0.1:3900`으로 바꿉니다. 테스트용 PostgreSQL 계정과 Garage 자격 증명은 `.env.test`와 같아야 합니다. 개발 서버가 시작될 때 Drizzle migration이 자동으로 적용됩니다.

```bash
pnpm format:check
pnpm lint
pnpm check
pnpm test:unit
pnpm test:smoke
pnpm build
```

`test:smoke`는 `compose.test.yaml`의 실제 PostgreSQL, Garage, app 컨테이너를 사용합니다. 테스트 후 컨테이너와 전용 데이터를 지우려면 다음을 실행합니다.

```bash
docker compose -f compose.test.yaml down --volumes --remove-orphans
```

Paraglide 코드는 설치할 때 자동 생성되며 `src/lib/paraglide`는 Git에서 제외합니다. 메시지를 바꾼 뒤에는 `pnpm i18n:compile`을 실행합니다.

## 인증과 계정 승인

가입할 때 아이디, 닉네임, 이메일, 비밀번호를 저장합니다. 로그인은 아이디와 비밀번호만 사용하며 이메일 인증 서비스는 없습니다. 새 계정은 `approved = false`로 생성되며 승인 전에는 보호 기능을 사용할 수 없습니다.

운영 계정 승인은 PostgreSQL 컨테이너에서 수행합니다.

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE \"user\" SET approved = true WHERE username = 'your_id';"
```

`approved`가 유일한 사용 승인 상태입니다. 승인된 작성자는 모든 글, 시리즈, 카테고리를 관리할 수 있습니다. 글의 `authorId`는 최초 작성자 표시이며 수정 소유권이 아닙니다.

## 글과 이미지

- `publishedAt = NULL`은 임시 글, 미래 시각은 예약 글, 현재·과거는 공개 글입니다.
- `No index` 글은 공개·사이트 검색·RSS에는 포함되고 sitemap에서는 제외됩니다.
- 본문은 textarea에서 Markdown으로 작성하며 `.md` 파일을 불러올 수 있습니다.
- Preview와 공개 글은 동일한 서버 renderer와 sanitizer를 사용합니다.
- 이미지는 브라우저에서 WebP로 압축한 뒤 즉시 Garage에 업로드합니다.
- object key는 `posts/{assetId}/{imageId}.webp`, 공개 URL은 `/media/{assetId}/{imageId}.webp`입니다.
- 이미지 삭제는 object만 즉시 지우며 Markdown 링크나 글 삭제 시 남는 orphan object는 자동 정리하지 않습니다.

본문은 UTF-8 1MiB, Preview request는 4MiB, 이미지 업로드는 WebP 4MiB까지 허용합니다. 검색 날짜와 보관함 경계는 `Asia/Seoul`, 저장 시각은 UTC instant, 화면 시각은 브라우저 locale/timezone을 사용합니다.

## 데이터베이스와 배포

`drizzle/0000_*.sql`은 새 PostgreSQL용 clean 기준선입니다. 앱은 시작할 때 공식 Drizzle runtime migrator를 실행하고 migration 실패 시 기동하지 않습니다. 검색은 PostgreSQL `pg_trgm`을 사용합니다.

GitHub Actions는 검사와 테스트가 모두 성공한 `main`에서 다음 이미지만 GHCR에 게시합니다.

```text
ghcr.io/zhdlxh48/mayb-log:main
ghcr.io/zhdlxh48/mayb-log:sha-<full commit sha>
```

Synology 배포는 자동화하지 않습니다. 실제 설치, 업데이트, rollback, 백업 절차는 [Synology 배포 가이드](./docs/DEPLOY_SYNOLOGY.md)를 따릅니다. 코드 위치와 데이터 흐름은 [아키텍처 문서](./docs/ARCHITECTURE.md)에 정리했습니다.

기존 Cloudflare D1/R2 데이터는 자동 이전되지 않습니다. 필요하면 별도의 일회성 변환과 검증을 거쳐 PostgreSQL/Garage로 옮겨야 합니다.
