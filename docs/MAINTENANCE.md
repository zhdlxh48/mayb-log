# 유지보수와 추가 개발

## 처음 읽을 순서

1. `src/pages/index.astro`: Markdown About을 읽어 레이아웃에 넣는 가장 작은 페이지입니다.
2. `src/layouts/BaseLayout.astro`: 공통 head·Sidebar·main·Footer를 조합합니다.
3. `src/pages/posts/index.astro` → `PostBrowserLayout.astro` → `PostList.astro` → `PostListItem.astro`: 글 목록을 만드는 흐름입니다.
4. `src/lib/posts.ts`: 글을 한 번 조회하고 검증한 뒤 공개 글·분류·Archive를 제공합니다.
5. `src/pages/posts/[id].astro` → `PostLayout.astro`: 글 본문과 목차·메타데이터·이웃 글을 조합합니다.

`.astro` 파일의 위쪽 `---` 안 코드는 서버/빌드에서 실행됩니다. 아래쪽은 HTML 템플릿입니다. `{변수}`로 값을 출력하고, `<slot />`에 자식 내용을 넣습니다. `.astro` 컴포넌트를 사용한다고 브라우저에 프레임워크가 전송되는 것은 아닙니다. `<script>`만 브라우저에서 실행됩니다.

`[id].astro` 같은 파일은 `getStaticPaths()`가 반환하는 값마다 HTML을 만듭니다. 사용자에게 보이는 분류는 JS로 필터링하지 않고 실제 정적 URL을 갖습니다.

## 구조와 데이터 흐름

```text
src/content/       글·작성자·시리즈·About 원본
        ↓ src/content.config.ts에서 스키마 검사
src/lib/posts.ts   참조·렌더링·시리즈 순서 검증, draft 제외
        ↓ taxonomy.ts / archive.ts / dates.ts
src/pages/        URL별 페이지
        ↓ layouts/ + components/
Astro build       HTML·CSS·Sharp 이미지
        ↓ Pagefind + check-build.mjs
dist/             배포할 완성된 파일
        ↓ GitHub Actions
GitHub Pages
```

| 수정하려는 내용 | 먼저 볼 곳 |
| --- | --- |
| 사이트 이름·주소·시간대 | `src/config/site.ts` |
| 공통 색·간격·반응형·글꼴 | `src/styles/global.css` |
| Sidebar 항목과 개수 | `src/components/Sidebar.astro`, `src/lib/posts.ts` |
| 목록 구조·보기 전환 | `PostListItem.astro`, `PostList.astro` |
| 게시글 메타데이터·이웃 글 | `src/layouts/PostLayout.astro` |
| 필수 필드·새 Frontmatter | `src/content.config.ts` |
| 태그 URL·정렬 | `src/lib/taxonomy.ts` |
| 날짜 표시·그룹 | `src/lib/dates.ts`, `archive.ts` |
| Markdown directive | `src/lib/markdown/directives.ts` |
| 본문 링크·이미지 | `src/lib/markdown/links.ts`, `images.ts` |
| 반응형·OG 크기 정책 | `src/lib/images.ts`, `ContentImage.astro` |
| 검색 UI | `src/pages/search.astro`, `public/scripts/search.js` |
| SEO | `BaseHead.astro`, `src/lib/seo.ts`, `rss.xml.ts`, `astro.config.mjs` |
| 빌드·배포 | `package.json`, `.github/workflows/ci.yml` |

경로를 직접 `/mayb-log/...`로 반복 작성하지 말고 `url('posts/...')`를 사용합니다. 절대 URL은 `absolute()`, Astro가 생성한 asset은 `assetAbsolute()`를 사용합니다. 각 페이지에서 콘텐츠 필터·카운트·정렬을 새로 구현하지 말고 `getContent()` 결과를 사용하세요.

구조가 같은 목록에는 기존 `PostBrowserLayout`을 사용합니다. 단순히 HTML 몇 줄이 비슷하다는 이유로 범용 컴포넌트 팩터리나 추상 클래스를 만들 필요는 없습니다. 새 기능에 실제로 필요한 부분만 공유합니다.

## 구현에서 알아둘 점

- Astro 7.3은 `markdown.processor`에 공식 `@astrojs/markdown-remark`의 `unified()`를 지정해야 remark 플러그인을 사용할 수 있습니다. 오래된 설정 예제의 최상위 `remarkPlugins`를 그대로 복사하지 마세요.
- Zod는 `astro/zod`에서 가져옵니다. 콘텐츠 타입은 `CollectionEntry<'posts'>`에서 추론합니다.
- Astro glob loader는 일부 Markdown 렌더 오류를 로그로만 남깁니다. `getContent()`가 `rendered` 유무를 검사해 빌드를 실패시키는 이유입니다.
- Pagefind는 Astro 빌드 후 생성됩니다. 검색 모듈을 일반 브라우저 모듈 `public/scripts/search.js`에서 동적으로 읽습니다. Astro 7.3.1 빌드에서 동적 import의 Vite preload 표시가 남는 문제를 피하면서 검색 페이지에서만 코드를 로드합니다.
- `astro.config.mjs`의 Sitemap 필터는 생성된 HTML의 robots meta를 읽습니다. noindex 판정을 다시 구현하지 않기 위해서입니다. `outDir`를 바꾸면 여기와 산출물 검사 경로도 함께 바꿔야 합니다.
- Tailwind는 `src/`만 검사합니다. 테스트 보고서·격리 fixture를 CSS 후보로 읽지 않습니다. 긴 utility 나열 대신 의미를 드러내는 CSS 클래스를 사용합니다.
- 테스트 fixture는 자체 Astro/Vite 캐시를 씁니다. 개발 서버와 테스트 복사본이 서로의 콘텐츠 캐시를 덮어쓰지 않습니다.

## 기능 추가 예시

예를 들어 글에 `readingNote`라는 선택 필드를 추가하려면:

1. `content.config.ts`에 선택 스키마를 추가합니다.
2. `PostLayout.astro`에서 값이 있을 때만 표시합니다.
3. 콘텐츠 가이드에 사용 예를 추가합니다.
4. 새 값에 검증 규칙이 있다면 관련 오류 케이스를 추가합니다. 단순 문구나 CSS 변경마다 구현을 그대로 반복하는 테스트를 만들 필요는 없습니다.
5. `pnpm test`, `pnpm build`로 확인합니다. 상호작용이나 레이아웃 변경은 `pnpm test:content`, `pnpm test:browser`도 실행합니다.

새 directive는 지원 목록·허용 속성·HTML 출력·CSS·문서·잘못된 입력 검사를 함께 추가합니다. 새 라이브러리를 설치하기 전에 Astro/HTML/CSS의 기본 기능으로 해결할 수 있는지 먼저 확인하세요.

## Git 운영

모든 기능 브랜치는 **최신 main**에서 만듭니다. 기능 하나를 완료한 뒤 다음 기능을 시작합니다.

```sh
git switch main
git pull --ff-only origin main
git switch -c feature/reading-note
# 구현하고 검사
git add src docs tests
git commit -m "feat: add optional reading notes"
```

PowerShell에서 저장소의 도우미를 실행할 수 있습니다.

```powershell
./scripts/complete-feature.ps1 -Branch feature/reading-note
```

도우미는 커밋하지 않은 변경이 있으면 중단합니다. 기능을 `dev`에 `--no-ff` 병합하고 테스트·빌드를 실행합니다. 최신 원격 `main`을 기능 브랜치에 먼저 병합한 후 기능 브랜치를 `main`에 직접 병합합니다. 추가 변경이 있으면 `dev`에도 반영하고 두 브랜치의 트리가 같은지 확인한 뒤 push합니다. 브라우저·콘텐츠 전체 검사 결과는 CI에서도 확인하세요.

수동으로 같은 작업을 하려면:

```sh
git fetch origin
git switch dev
git merge --ff-only origin/dev
git merge --no-ff feature/reading-note -m "chore: merge reading notes into dev"
pnpm test
pnpm build
git switch feature/reading-note
git merge --no-ff origin/main -m "chore: sync main into reading notes"
# 충돌을 해결했다면 커밋하고 다시 검사
git switch main
git merge --ff-only origin/main
git merge --no-ff feature/reading-note -m "chore: merge reading notes into main"
git switch dev
git merge --no-ff feature/reading-note -m "chore: sync reading notes into dev"
git push origin main dev feature/reading-note
```

`dev` 자체를 `main`에 병합하지 않습니다. 완료한 브랜치는 인계 시 보존되어 있습니다. 충돌이 나면 해당 단계에서 멈춰 원인을 확인하고 해결 후 검증하세요. 충돌이 없다는 것과 코드가 정상이라는 것은 별개입니다.

긴급 수정은 최신 `main`에서 `hotfix/<name>`을 만들고, 검사·커밋 후 `main`, `dev`에 각각 `--no-ff` 병합합니다. 콘텐츠는 최신 `main`에서 `content/<name>`을 만들고 검사 후 `main`에 직접 병합합니다. 콘텐츠 작업 후 `dev`가 뒤처지는 것은 이 규칙상 정상이며, 다음 기능의 최신 main 변경이 기능 브랜치와 함께 dev에도 들어옵니다.

커밋은 영문 Conventional Commits를 사용합니다: `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `ci: ...`, `chore: ...`. 자동 도우미는 기능 브랜치용입니다. hotfix·content에 그대로 사용하지 마세요.

## 샘플을 삭제할 때의 테스트

사용자용 샘플 글 3개는 모두 삭제해도 됩니다. `seed-test-content.mjs`가 `.fixtures/content-build/` 안에 고정된 검증용 콘텐츠를 생성합니다. 실제 글·작성자·About을 변경하지 않습니다.

`pnpm test:content`는 메타데이터·참조·directive 오류, draft/noindex/미래 날짜, SVG·작은 OG, 글 0개를 검사하고, 마지막에 브라우저 검사에 사용할 사이트를 남깁니다. `pnpm test:browser`는 이 사이트를 4323 포트에서 검사합니다. 제품 소스가 바뀌면 두 명령을 순서대로 다시 실행하세요.

실제 글은 `pnpm build`가 타입·콘텐츠·렌더링과 생성된 모든 페이지의 링크·anchor·이미지·SEO를 검사합니다. 자신의 글의 외형도 확인하려면 `pnpm preview`로 엽니다. fixture 결과만 보고 실제 글의 줄바꿈까지 확인했다고 판단하지 않습니다.

`test-results/`, `playwright-report/`, `.fixtures/`는 Git에서 제외됩니다. 실패 상세는 `.fixtures/content-build/logs/`, 브라우저 trace는 `test-results/`에 있습니다. `pnpm exec playwright show-report`로 보고서를 열 수 있습니다.

## 의존성 갱신

1. 최신 main에서 `feature/update-dependencies`를 만듭니다.
2. Astro 공식 변경 기록과 processor 호환 범위를 확인합니다. 버전 숫자만 함께 올리지 않습니다.
3. `pnpm add --save-exact <package>@<version>` 또는 개발 의존성은 `pnpm add -D --save-exact ...`로 갱신합니다. lockfile도 커밋합니다.
4. Node/pnpm을 바꾸면 `.node-version`, `package.json`, workflow를 함께 맞춥니다.
5. 기본·콘텐츠·브라우저 검사와 빌드를 실행하고 CI 통과 후 기능 브랜치 흐름대로 병합합니다.

Sharp는 Astro 기본 이미지 서비스입니다. 외부 변환 CLI를 추가하거나 adaptive 압축을 미리 만들 필요는 없습니다. 이미지 정책 변경은 크기 함수·Markdown 플러그인·컴포넌트·검사를 함께 확인합니다.

## 배포 실패 분석과 복구

Actions의 실패한 단계부터 확인합니다.

| 실패 지점 | 확인할 내용 |
| --- | --- |
| install | Node/pnpm 버전, lockfile 커밋 여부, 네트워크 |
| check / build | 로그에 표시한 Markdown 경로, 필수 값, 잘못된 참조·이미지·directive |
| check:build | 잘못된 base, 삭제한 글 링크, 존재하지 않는 heading anchor |
| test:content | fixture 로그의 기대 오류와 실제 오류, Astro API 변경 |
| browser | 실패 trace, 캐시된 오래된 fixture 서버, Playwright 브라우저 설치 |
| deploy | Pages Source가 Actions인지, `github-pages` 환경과 main 배포 권한 |

Windows에서 Firefox에 `spawn UNKNOWN` 또는 side-by-side 오류가 나면 브라우저 실행에 필요한 Windows 런타임 문제일 수 있습니다. 이 프로젝트의 실제 검증에서는 Linux CI의 Firefox를 사용했습니다. 브라우저 실행 실패를 제품 테스트 통과로 계산하지 않습니다.

실패한 새 빌드는 기존 정상 Pages 배포를 덮어쓰지 않습니다. 이미 배포한 문제가 있다면 최신 main에서 hotfix 브랜치를 만들어 수정합니다. 되돌릴 때는 필요한 변경을 `git revert`로 되돌리는 커밋을 만들고 검사한 뒤 main과 dev에 각각 병합합니다. 공유 브랜치의 과거 기록을 강제로 덮어쓰지 않습니다.

사이트의 `/mayb-log/revision.json`에는 배포 커밋이 들어갑니다. Actions의 `head_sha`와 비교하면 실제 제공되는 버전을 확인할 수 있습니다. 첫 확인 직후 CDN 갱신이 늦으면 잠시 후 새로고침합니다.

## 참고 문서

- [Astro 콘텐츠 컬렉션](https://docs.astro.build/en/guides/content-collections/)
- [Astro Markdown processor](https://docs.astro.build/en/guides/markdown-content/#setting-up-a-markdown-processor)
- [Astro 이미지](https://docs.astro.build/en/guides/images/)
- [Pagefind 검색 API](https://pagefind.app/docs/api/)
- [GitHub Pages 배포](https://docs.astro.build/en/guides/deploy/github/)
