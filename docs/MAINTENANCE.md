# 유지보수 가이드

## 구조와 데이터 흐름

`src/content.config.ts`가 posts·authors·series·pages 스키마를 정의합니다. `src/lib/posts.ts`가 공개 글을 한 번 읽어 시리즈·태그·카테고리·Archive 데이터를 만들고 Sidebar와 모든 목록이 이 결과를 공유합니다.

| 변경 목적         | 주요 위치                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| 사이트 이름·주소  | `src/config/site.ts`                                                                                |
| 콘텐츠 스키마     | `src/content.config.ts`                                                                             |
| 공개 글과 인덱스  | `src/lib/posts.ts`, `taxonomy.ts`, `archive.ts`                                                     |
| base 경로         | `src/lib/urls.ts`                                                                                   |
| Markdown/MDX 처리 | `astro.config.mjs`, `src/lib/markdown/`                                                             |
| 본문 서식         | `src/components/ArticleProse.astro`                                                                 |
| 공통 레이아웃     | `src/layouts/BaseLayout.astro`, `PostLayout.astro`                                                  |
| 검색              | `src/pages/search.astro`, `search-data.astro`, `src/lib/search*.ts`, `src/workers/search.worker.ts` |
| SEO·RSS·Sitemap   | `BaseHead.astro`, `src/lib/seo.ts`, `rss.xml.ts`, `astro.config.mjs`                                |
| CI와 배포         | `.github/workflows/ci.yml`                                                                          |

`global.css`에는 Tailwind import, 색상·글꼴 토큰, 공통 포커스 표시만 둡니다. 화면 스타일은 해당 Astro 컴포넌트의 유틸리티 클래스로 수정합니다. Markdown과 MDX가 만든 HTML의 서식은 `ArticleProse.astro`의 scoped CSS에 모여 있으며 전역 Tailwind 테마 변수를 공유합니다. 독립 MDX 컴포넌트는 `.not-prose`로 감싸 본문 selector에서 제외합니다.

## 기능을 수정할 때

새 분류는 기존 `getContent()` 반환값과 URL helper를 먼저 사용합니다. 컴포넌트가 한 곳에서만 쓰이고 짧다면 그 페이지에 두고, 독립된 의미와 재사용이 있을 때만 분리합니다.

검색 문서는 `search-data.astro`의 `data-search-document` 요소에서 만들어집니다. `search-text.ts`는 게시글만 제목·부제목·description·본문·태그·카테고리·시리즈·작성자·날짜를 모두 색인합니다. Series는 제목과 설명, Category와 Tag는 이름, Author는 이름과 소개, Archive는 연·월과 Archive 문구만 색인하므로 하위 글 제목이 인덱스 결과에 중복되지 않습니다. 본문에서는 script, style, template, noscript와 숨긴 구현용 노드를 제거하고 보이는 링크 문구와 이미지 대체 텍스트를 유지합니다.

`search-view.ts`의 `SUMMARY_LIMIT`, `PAGE_SIZE`, `PAGE_BLOCK_SIZE`가 각각 All 요약 개수 10, 필터 페이지 크기 20, 페이지 번호 블록 10을 정의합니다. Worker 검색 한 번의 relevance 순서를 유지한 채 브라우저에서 종류별로 나누며, 필터·More·페이지 이동은 검색이나 말뭉치 요청을 반복하지 않습니다. 검색어·필터·페이지는 History API로 복원합니다. 입력이 처음 생길 때만 말뭉치와 Worker를 불러오며 다른 페이지에는 FlexSearch 코드가 실리지 않습니다. 첫 요청이 실패하면 같은 페이지에서 다시 입력해 재시도할 수 있습니다.

MDX에는 필요한 컴포넌트를 글에서 직접 import합니다. 공통 Provider 계층이나 범용 embed 컴포넌트를 추가하지 않습니다. 일반 HTML이나 Markdown으로 충분하면 `.md`를 유지합니다. `LinkPreview` 같은 독립 UI는 `<div class="not-prose">`로 감쌉니다. 일반 iframe은 공통 여백·테두리·최대 너비만 적용되므로 영상 비율이 필요할 때 콘텐츠에서 `aspect-video w-full`을 지정합니다.

## 품질 검사

CI와 같은 순서입니다.

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm check
pnpm test
pnpm build
pnpm test:build
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

- `tests/unit/`: 날짜, slug, 정렬, 이미지, Markdown, 검색, SEO의 빠른 로직 검사
- `tests/build/`: 실제 `dist/`의 경로, 링크, anchor, 이미지, JSON-LD, RSS, Sitemap, MDX, 검색 데이터 검사
- `tests/browser/`: 375·768·1024·1440·1920·2560px, List/Grid, 검색, MDX, JS 비활성, 접근성, 수평 overflow 검사

글을 모두 삭제한 상태는 콘텐츠 작업 브랜치에서 임시로 확인한 뒤 원복합니다. 빌드·브라우저 테스트는 생성된 글 경로와 검색 데이터를 동적으로 찾으므로 샘플 ID, 분류 이름, 개수에 맞춰 테스트를 수정할 필요가 없습니다.

## Git 운영

기능 브랜치는 최신 `main`에서 만듭니다.

```sh
git switch main
git pull --ff-only
git switch -c feature/example
# 구현, 검사, Conventional Commit
git switch dev
git merge --no-ff feature/example
# 통합 검사
git switch feature/example
git merge main
# 다시 검사
git switch main
git merge --no-ff feature/example
```

기능 브랜치를 `main`에 직접 병합하며 `dev`를 `main`에 병합하지 않습니다. 병합 전에는 최신 `main`을 기능 브랜치로 병합합니다. 콘텐츠는 `content/*`에서 검증 후 `main`에 직접 병합합니다. 긴급 수정은 `main`에서 `hotfix/*`를 만들고 `main`과 `dev` 양쪽에 병합합니다.

## 의존성 갱신

Node와 pnpm 버전은 `.node-version`, `package.json`, CI를 함께 바꿉니다. 패키지는 한 번에 작은 범위로 갱신하고 lockfile을 커밋합니다. Astro, MDX, Tailwind, FlexSearch처럼 빌드나 브라우저 출력에 영향을 주는 갱신은 전체 CI 순서를 실행합니다.

## 배포 실패 분석

| 실패 단계     | 먼저 볼 곳                                                  |
| ------------- | ----------------------------------------------------------- |
| format / lint | 로그의 파일과 규칙, `pnpm format`·`pnpm lint:fix` 결과      |
| check / build | Frontmatter, 참조, Markdown/MDX 문법, 이미지 경로           |
| test:build    | base 경로, 삭제한 글 링크, heading anchor, SEO·Sitemap      |
| test:browser  | 해당 프로젝트 trace와 screenshot, 검색 worker 네트워크      |
| deploy        | Pages 권한, Source=GitHub Actions, build artifact 존재 여부 |

배포가 실패해도 직전 성공 배포는 유지됩니다. 실패한 커밋을 고치고 다시 push하거나 Actions에서 `main` workflow를 재실행합니다. 배포 후 `revision.json`의 commit과 workflow commit이 같은지 확인할 수 있습니다.
