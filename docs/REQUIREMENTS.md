# 요구사항 대조표

원문 0–115 전체를 항목별로 추적합니다. 실제 실행 결과·환경·제한은 [개발 보고서](IMPLEMENTATION_REPORT.md)에 기록합니다. 파일명만 표시한 컴포넌트는 src/components/ 또는 src/layouts/, 문서는 docs/에 있습니다. 원문의 예시는 [확정된 결정](DECISIONS.md)과 콘텐츠 가이드의 유효한 문법으로 보정했습니다.

| 번호 | 원문 항목 | 구현 위치 | 검증 근거 |
| --- | --- | --- | --- |
| 0 | 프로젝트 목표 | package.json, astro.config.mjs, src/ | 고정 버전·static·strict·의존성 검토 |
| 1 | 핵심 기술 스택 | package.json, astro.config.mjs, src/ | 고정 버전·static·strict·의존성 검토 |
| 2 | 의존성 원칙 | package.json, astro.config.mjs, src/ | 고정 버전·static·strict·의존성 검토 |
| 3 | 프로젝트 기본 경로 | src/config/site.ts, src/lib/urls.ts, src/ | core.test.ts·check-build.mjs |
| 4 | 전체 디렉터리 구조 | src/config/site.ts, src/lib/urls.ts, src/ | core.test.ts·check-build.mjs |
| 5 | Content Collections | src/content.config.ts, src/lib/posts.ts | test-content.mjs·image()·참조·필수 값·날짜·시리즈 검증 |
| 6 | Post 파일 구조 | src/content.config.ts, src/lib/posts.ts | test-content.mjs·image()·참조·필수 값·날짜·시리즈 검증 |
| 7 | Post Frontmatter | src/content.config.ts, src/lib/posts.ts | test-content.mjs·image()·참조·필수 값·날짜·시리즈 검증 |
| 8 | 필수 / 선택 필드 | src/content.config.ts, src/lib/posts.ts | test-content.mjs·image()·참조·필수 값·날짜·시리즈 검증 |
| 9 | Thumbnail은 반드시 `image()` | src/content.config.ts, src/lib/posts.ts | test-content.mjs·image()·참조·필수 값·날짜·시리즈 검증 |
| 10 | 다른 스키마 validation | src/content.config.ts, src/lib/posts.ts | test-content.mjs·image()·참조·필수 값·날짜·시리즈 검증 |
| 11 | Authors Collection | src/content.config.ts, src/lib/posts.ts | test-content.mjs·image()·참조·필수 값·날짜·시리즈 검증 |
| 12 | Series Collection | src/content.config.ts, src/lib/posts.ts | test-content.mjs·image()·참조·필수 값·날짜·시리즈 검증 |
| 13 | Categories / Tags | src/lib/taxonomy.ts | indexes.test.ts·slug 충돌 fixture |
| 14 | Taxonomy slug | src/lib/taxonomy.ts | indexes.test.ts·slug 충돌 fixture |
| 15 | Pages Collection | src/content/pages/, src/pages/ | 정적 경로·About·check-build.mjs |
| 16 | 전체 URL 구조 | src/content/pages/, src/pages/ | 정적 경로·About·check-build.mjs |
| 17 | 게시물 정렬 | src/lib/posts.ts, taxonomy.ts, archive.ts, dates.ts | indexes.test.ts·draft/noindex/미래 날짜 fixture |
| 18 | Draft | src/lib/posts.ts, taxonomy.ts, archive.ts, dates.ts | indexes.test.ts·draft/noindex/미래 날짜 fixture |
| 19 | `noindex` | src/lib/posts.ts, taxonomy.ts, archive.ts, dates.ts | indexes.test.ts·draft/noindex/미래 날짜 fixture |
| 20 | Archive | src/lib/posts.ts, taxonomy.ts, archive.ts, dates.ts | indexes.test.ts·draft/noindex/미래 날짜 fixture |
| 21 | Timezone | src/lib/posts.ts, taxonomy.ts, archive.ts, dates.ts | indexes.test.ts·draft/noindex/미래 날짜 fixture |
| 22 | Sidebar가 사이트의 핵심 Navigation | Sidebar.astro, MobileIndex.astro, BaseLayout.astro | browser/site.spec.ts·모바일 native Index·개수·계층 검토 |
| 23 | Sidebar 항목 | Sidebar.astro, MobileIndex.astro, BaseLayout.astro | browser/site.spec.ts·모바일 native Index·개수·계층 검토 |
| 24 | Sidebar Section title | Sidebar.astro, MobileIndex.astro, BaseLayout.astro | browser/site.spec.ts·모바일 native Index·개수·계층 검토 |
| 25 | 전체 글 보기 | Sidebar.astro, MobileIndex.astro, BaseLayout.astro | browser/site.spec.ts·모바일 native Index·개수·계층 검토 |
| 26 | Sidebar Desktop behavior | Sidebar.astro, MobileIndex.astro, BaseLayout.astro | browser/site.spec.ts·모바일 native Index·개수·계층 검토 |
| 27 | Mobile Navigation | Sidebar.astro, MobileIndex.astro, BaseLayout.astro | browser/site.spec.ts·모바일 native Index·개수·계층 검토 |
| 28 | 디자인 철학 | src/styles/global.css, BaseLayout.astro | 375/768/1024/1440px 브라우저·스크린샷 검토 |
| 29 | 디자인 Reference 해석 | src/styles/global.css, BaseLayout.astro | 375/768/1024/1440px 브라우저·스크린샷 검토 |
| 30 | Typography | src/styles/global.css, BaseLayout.astro | 375/768/1024/1440px 브라우저·스크린샷 검토 |
| 31 | Color | src/styles/global.css, BaseLayout.astro | 375/768/1024/1440px 브라우저·스크린샷 검토 |
| 32 | Radius / Border / Shadow | src/styles/global.css, BaseLayout.astro | 375/768/1024/1440px 브라우저·스크린샷 검토 |
| 33 | Main Layout | src/styles/global.css, BaseLayout.astro | 375/768/1024/1440px 브라우저·스크린샷 검토 |
| 34 | Post 목록 | PostBrowserLayout.astro, PostList.astro, PostListItem.astro | List/Grid·저장/저장소 차단·썸네일 유무 검사 |
| 35 | List / Grid Toggle | PostBrowserLayout.astro, PostList.astro, PostListItem.astro | List/Grid·저장/저장소 차단·썸네일 유무 검사 |
| 36 | View 선택 저장 | PostBrowserLayout.astro, PostList.astro, PostListItem.astro | List/Grid·저장/저장소 차단·썸네일 유무 검사 |
| 37 | List View | PostBrowserLayout.astro, PostList.astro, PostListItem.astro | List/Grid·저장/저장소 차단·썸네일 유무 검사 |
| 38 | Thumbnail 없는 List item | PostBrowserLayout.astro, PostList.astro, PostListItem.astro | List/Grid·저장/저장소 차단·썸네일 유무 검사 |
| 39 | Grid View | PostBrowserLayout.astro, PostList.astro, PostListItem.astro | List/Grid·저장/저장소 차단·썸네일 유무 검사 |
| 40 | Thumbnail 없는 Grid item | PostBrowserLayout.astro, PostList.astro, PostListItem.astro | List/Grid·저장/저장소 차단·썸네일 유무 검사 |
| 41 | Article 페이지 | PostLayout.astro, PostToc.astro | 정적 본문·Astro headings·시리즈·이웃 글·anchor 검사 |
| 42 | Table of Contents | PostLayout.astro, PostToc.astro | 정적 본문·Astro headings·시리즈·이웃 글·anchor 검사 |
| 43 | Markdown 기본 기능 | astro.config.mjs, src/lib/markdown/ | directives.test.ts·markdown.test.ts·GFM/Shiki |
| 44 | remark-directive | astro.config.mjs, src/lib/markdown/ | directives.test.ts·markdown.test.ts·GFM/Shiki |
| 45 | Callout | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 46 | Figure | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 47 | Social | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 48 | 외부 Metadata scraping 금지 | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 49 | YouTube | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 50 | Link Card | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 51 | Metric | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 52 | Details | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 53 | 잘못된 Directive | src/lib/markdown/directives.ts, YouTubeEnhancement.astro | 7종 directive·잘못된 속성·중첩·클릭 전후·JS 없음 |
| 54 | 이미지 원본 정책 | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 55 | Astro Image Pipeline 우선 | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 56 | Image format | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 57 | Image size | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 58 | Responsive image breakpoint | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 59 | WebP quality | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 60 | Quality 최소값 60 정책 | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 61 | 목표 byte size는 v1에서 제외 | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 62 | Markdown 이미지 | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 63 | Thumbnail 출력 | src/lib/images.ts, markdown/images.ts, ContentImage.astro | images.test.ts·원본 5종+세로/소형·WebP·SVG·1600px |
| 64 | OG Image | PostLayout.astro, src/lib/images.ts | small OG 320×168·SVG/썸네일 없음 image 생략 |
| 65 | Thumbnail 없는 Post의 SEO image | PostLayout.astro, src/lib/images.ts | small OG 320×168·SVG/썸네일 없음 image 생략 |
| 66 | SEO Head | BaseHead.astro, src/lib/seo.ts, PostLayout.astro | seo.test.ts·check-build.mjs·canonical/JSON-LD |
| 67 | Title 규칙 | BaseHead.astro, src/lib/seo.ts, PostLayout.astro | seo.test.ts·check-build.mjs·canonical/JSON-LD |
| 68 | Description 규칙 | BaseHead.astro, src/lib/seo.ts, PostLayout.astro | seo.test.ts·check-build.mjs·canonical/JSON-LD |
| 69 | Canonical | BaseHead.astro, src/lib/seo.ts, PostLayout.astro | seo.test.ts·check-build.mjs·canonical/JSON-LD |
| 70 | BlogPosting JSON-LD | BaseHead.astro, src/lib/seo.ts, PostLayout.astro | seo.test.ts·check-build.mjs·canonical/JSON-LD |
| 71 | Semantic HTML | src/layouts/, src/components/, CONTENT_GUIDE.md | semantic HTML·heading·Axe·본문 h2부터 작성 |
| 72 | Heading hierarchy | src/layouts/, src/components/, CONTENT_GUIDE.md | semantic HTML·heading·Axe·본문 h2부터 작성 |
| 73 | Sitemap | astro.config.mjs, src/pages/rss.xml.ts | RSS·Sitemap·noindex 제외·하위경로 robots.txt 미생성 |
| 74 | RSS | astro.config.mjs, src/pages/rss.xml.ts | RSS·Sitemap·noindex 제외·하위경로 robots.txt 미생성 |
| 75 | robots.txt 주의 | astro.config.mjs, src/pages/rss.xml.ts | RSS·Sitemap·noindex 제외·하위경로 robots.txt 미생성 |
| 76 | Search | src/pages/search.astro, public/scripts/search.js | 한글/영문·로딩/빈 결과/실패·base·navigation 제외 |
| 77 | Search 페이지 | src/pages/search.astro, public/scripts/search.js | 한글/영문·로딩/빈 결과/실패·base·navigation 제외 |
| 78 | Pagefind + GitHub Pages base | src/pages/search.astro, public/scripts/search.js | 한글/영문·로딩/빈 결과/실패·base·navigation 제외 |
| 79 | Pagefind index 대상 | src/pages/search.astro, public/scripts/search.js | 한글/영문·로딩/빈 결과/실패·base·navigation 제외 |
| 80 | JavaScript budget | src/components/, src/styles/global.css | 브라우저 상호작용·Axe·measure-site.mjs·JS 없음 |
| 81 | Accessibility | src/components/, src/styles/global.css | 브라우저 상호작용·Axe·measure-site.mjs·JS 없음 |
| 82 | Performance | src/components/, src/styles/global.css | 브라우저 상호작용·Axe·measure-site.mjs·JS 없음 |
| 83 | GitHub Actions | .github/workflows/ci.yml | 실제 Actions·Pages 성공·revision.json |
| 84 | GitHub Actions build | .github/workflows/ci.yml | 실제 Actions·Pages 성공·revision.json |
| 85 | GitHub Pages 설정 | .github/workflows/ci.yml | 실제 Actions·Pages 성공·revision.json |
| 86 | Build 실패 조건 | src/content.config.ts, src/lib/posts.ts, taxonomy.ts, archive.ts | test-content.mjs·indexes.test.ts·빌드 실패/정렬/개수 |
| 87 | Taxonomy utility | src/content.config.ts, src/lib/posts.ts, taxonomy.ts, archive.ts | test-content.mjs·indexes.test.ts·빌드 실패/정렬/개수 |
| 88 | Sidebar 데이터 | src/content.config.ts, src/lib/posts.ts, taxonomy.ts, archive.ts | test-content.mjs·indexes.test.ts·빌드 실패/정렬/개수 |
| 89 | Sidebar 정렬 | src/content.config.ts, src/lib/posts.ts, taxonomy.ts, archive.ts | test-content.mjs·indexes.test.ts·빌드 실패/정렬/개수 |
| 90 | Tag 수가 매우 많아지는 미래 | Sidebar.astro, src/pages/ | 전체 태그 기본·tagLimit 확장 지점·페이지네이션 미도입 |
| 91 | Pagination | Sidebar.astro, src/pages/ | 전체 태그 기본·tagLimit 확장 지점·페이지네이션 미도입 |
| 92 | Header / Branding | BaseLayout.astro, MobileIndex.astro, src/pages/index.astro | 브랜딩·Markdown About·최소 Footer·스크린샷 |
| 93 | About | BaseLayout.astro, MobileIndex.astro, src/pages/index.astro | 브랜딩·Markdown About·최소 Footer·스크린샷 |
| 94 | Footer | BaseLayout.astro, MobileIndex.astro, src/pages/index.astro | 브랜딩·Markdown About·최소 Footer·스크린샷 |
| 95 | External Link | src/styles/global.css, astro.config.mjs, markdown/directives.ts | 기본 링크 동작·Tailwind4·Shiki·코드 overflow |
| 96 | CSS 구현 원칙 | src/styles/global.css, astro.config.mjs, markdown/directives.ts | 기본 링크 동작·Tailwind4·Shiki·코드 overflow |
| 97 | Tailwind 4 | src/styles/global.css, astro.config.mjs, markdown/directives.ts | 기본 링크 동작·Tailwind4·Shiki·코드 overflow |
| 98 | Shiki | src/styles/global.css, astro.config.mjs, markdown/directives.ts | 기본 링크 동작·Tailwind4·Shiki·코드 overflow |
| 99 | Article code | src/styles/global.css, astro.config.mjs, markdown/directives.ts | 기본 링크 동작·Tailwind4·Shiki·코드 overflow |
| 100 | Responsive breakpoints | src/styles/global.css, src/pages/404.astro | 4개 viewport·404 HTML/noindex·내부 탐색 |
| 101 | 404 | src/styles/global.css, src/pages/404.astro | 4개 viewport·404 HTML/noindex·내부 탐색 |
| 102 | SEO taxonomy pages | src/pages/, BaseHead.astro, scripts/check-build.mjs | 분류 제목/설명·검색 noindex·SEO 산출물 검사 |
| 103 | Search SEO | src/pages/, BaseHead.astro, scripts/check-build.mjs | 분류 제목/설명·검색 noindex·SEO 산출물 검사 |
| 104 | SEO 테스트 | src/pages/, BaseHead.astro, scripts/check-build.mjs | 분류 제목/설명·검색 noindex·SEO 산출물 검사 |
| 105 | Image 테스트 케이스 | src/content/posts/, scripts/test-content.mjs | 이미지 원본·샘플3개·산출물·빈 블로그 |
| 106 | Build artifact 검사 | src/content/posts/, scripts/test-content.mjs | 이미지 원본·샘플3개·산출물·빈 블로그 |
| 107 | Sample 콘텐츠 | src/content/posts/, scripts/test-content.mjs | 이미지 원본·샘플3개·산출물·빈 블로그 |
| 108 | README | README.md, package.json | 설치·글쓰기·검사·빌드·preview·배포 명령 안내 |
| 109 | package scripts | README.md, package.json | 설치·글쓰기·검사·빌드·preview·배포 명령 안내 |
| 110 | 코드 품질 | src/, tsconfig.json, MAINTENANCE.md | strict·컬렉션 타입 추론·공통 함수·명시적 Astro 페이지 |
| 111 | 과도한 abstraction 금지 | src/, tsconfig.json, MAINTENANCE.md | strict·컬렉션 타입 추론·공통 함수·명시적 Astro 페이지 |
| 112 | 구현 순서 | DECISIONS.md, IMPLEMENTATION_REPORT.md, Git history | 단계별 기능 브랜치·합의 사항·수용 기준 대조·stable API |
| 113 | 최종 Acceptance Criteria | DECISIONS.md, IMPLEMENTATION_REPORT.md, Git history | 단계별 기능 브랜치·합의 사항·수용 기준 대조·stable API |
| 114 | Codex가 임의로 변경하지 말아야 할 것 | DECISIONS.md, IMPLEMENTATION_REPORT.md, Git history | 단계별 기능 브랜치·합의 사항·수용 기준 대조·stable API |
| 115 | 구현 중 API가 달라진 경우 | DECISIONS.md, IMPLEMENTATION_REPORT.md, Git history | 단계별 기능 브랜치·합의 사항·수용 기준 대조·stable API |

미구현 기능을 완료 항목에 넣지 않았습니다. 원문에서 제외한 adaptive 압축·AVIF·페이지네이션·SPA·외부 메타데이터 수집은 의도적으로 추가하지 않았습니다. 실제 Safari는 미검증이며 WebKit·Firefox·Chromium 결과와 구분합니다.
