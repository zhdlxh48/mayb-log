# 개발 보고서

## 구현 결과

Astro 7.3.1 기반 정적 블로그를 구현했습니다. About 홈, Sidebar·모바일 Index, 공통 List/Grid 목록, 시리즈·카테고리·태그·Archive·작성자 페이지, 게시글·목차·이웃 글, 7종 directive, 이미지 변환, Pagefind, SEO·RSS·Sitemap·404와 Pages 자동 배포를 포함합니다.

제품 코드는 명시적인 Astro 페이지와 작은 공유 함수로 구성했습니다. React·SPA·MDX·UI 프레임워크·메타데이터 수집·별도 이미지 변환 파이프라인을 추가하지 않았습니다. 일반 페이지는 정적 HTML이며, 브라우저 JavaScript는 목록 보기 전환·YouTube 클릭 재생·검색에만 사용합니다.

기준은 [원문 로드맵](DEVELOPMENT_ROADMAP.txt)이며 [사용자와 확정한 결정](DECISIONS.md)이 우선합니다. 원문은 보관하고 수정 사항은 별도 문서에 기록했습니다. [요구사항 대조표](REQUIREMENTS.md)에서 원문 각 항목의 구현 위치와 검증 근거를 찾을 수 있습니다.

## 단계별 개발

| 단계 | 브랜치 | 결과 |
| --- | --- | --- |
| 초기 설정 | main | Astro·strict TypeScript·Tailwind·고정 버전, `74d2d71 chore: initial commit` |
| 기반 | feature/core-foundation | 원문·결정 보관, 사이트·URL·서울 날짜 helper, CI |
| 콘텐츠 | feature/content-model | 4개 컬렉션, 스키마·참조, 샘플 |
| 인덱스 | feature/content-indexes | 공개 글·분류·날짜 그룹·충돌 검증 |
| 레이아웃 | feature/site-layout | About·Sidebar·모바일 Index·Footer |
| 목록 | feature/post-browser | 모든 정적 분류 URL과 공통 List/Grid |
| 본문 | feature/post-detail | 메타데이터·목차·시리즈·이웃 글·작성자 |
| 확장 | feature/markdown-directives | 7종 의미 있는 HTML, YouTube 클릭 재생 |
| 이미지 | feature/image-policy | Astro Assets·Sharp·WebP·SVG·확대 방지 |
| 검색·SEO | feature/search-seo | 검색 상태 처리, canonical·OpenGraph·JSON-LD·RSS·Sitemap·404 |
| 배포 | feature/pages-deployment | 검증된 dist를 Pages에 배포, 배포 커밋 식별 |
| 품질·인계 | feature/quality-handover | 독립 fixture·브라우저 회귀·접근성·가이드·요구사항 대조 |

기능은 최신 main에서 분기해 dev에 `--no-ff` 병합하고 통합 검사했습니다. main을 기능 브랜치에 먼저 동기화한 후 기능 브랜치를 main에 직접 병합했습니다. dev 자체를 main에 병합하지 않았으며 작업 브랜치를 보존했습니다.

## 구현하면서 보정한 내용

1. Astro 7.3의 공식 Unified processor와 `astro/zod` API를 사용했습니다.
2. 원문의 여러 줄 directive 속성을 표준 한 줄 예제로 문서화했습니다. 중첩 details는 바깥 fence를 더 길게 수정했습니다.
3. Markdown 렌더 실패가 로그만 남기고 빌드를 성공시키는 Astro glob 동작을 발견했습니다. 모든 글·페이지의 렌더 결과를 확인해 빈 본문 배포를 막았습니다.
4. 빌드 후 생성되는 Pagefind의 동적 import에서 미해결 Vite preload 표시를 발견했습니다. 검색 전용 일반 브라우저 모듈로 단순화하고 실제 검색 검사를 추가했습니다.
5. 본문 내부 링크도 base helper를 사용하게 했습니다. 잘못된 anchor·이미지·내부 URL은 산출물 검사에서 실패합니다.
6. 문서대로 작은 원본을 확대하지 않습니다. 320×240 원본의 OG는 실제 320×168, SVG 썸네일의 OG/JSON-LD 이미지는 생략됩니다.
7. 실제 샘플을 삭제해도 인수 검사가 유지되도록 fixture 콘텐츠를 별도로 생성합니다. Astro/Vite 캐시도 분리했습니다.

## 검증

| 영역 | 근거 |
| --- | --- |
| 타입 | `pnpm check`, strict, 오류·경고·힌트 0 |
| 핵심 로직 | `pnpm test`: 13개 검사 |
| 콘텐츠 실패 | `pnpm test:content`: 필수 값·작성자·날짜·시리즈·slug·이미지·directive 16개 실패 시나리오 |
| 공개 정책 | draft 경로 제외, 미래 날짜 공개, noindex 공개·RSS 포함·Sitemap 제외 |
| 이미지 | 크기 함수·세로형·원본 확대 방지·OG 실제 크기·SVG 예외, 원문 5종과 세로형·작은 원본 |
| 빈 블로그 | 글 전체 삭제 fixture의 Astro build·RSS·분류·Pagefind 성공 |
| 산출물 | 실제 샘플 기준 HTML 24개, 내부 참조 1,366개, srcset·anchor·canonical·JSON-LD·RSS·Sitemap·Pagefind 검사 |
| 상호작용 | 9개 시나리오 × Chromium·Firefox·WebKit = 27개 CI 검사 |
| 반응형·접근성 | 375·768·1024·1440px, About·목록·본문·검색의 Axe WCAG A/AA 검사, 긴 제목·코드·표 overflow, skip link |
| JS 없음 | About·목록·모바일 Index·분류·Archive·작성자·본문·중첩 details·YouTube 링크 |

브라우저 검사는 샘플을 사용하는 실제 빌드와 독립 fixture 양쪽에서 수행했습니다. CI는 실제 콘텐츠의 빌드 산출물을 검사한 뒤, 같은 제품 소스에 고정된 테스트 콘텐츠를 넣어 브라우저 회귀를 실행합니다. YouTube 자동 검사는 클릭 후 iframe 주소와 생성 시점을 확인하며 외부 영상 응답은 테스트 응답으로 대체합니다. 실제 영상 스트리밍의 가용성을 보장하는 검사는 아닙니다.

접근성 자동 검사 통과가 모든 보조기기 사용성을 보장하지는 않습니다. 키보드·focus·native details도 별도로 확인했습니다.

## 실제 검사 환경과 측정

- 로컬: Windows, Node 24.20.0, pnpm 11.25.0, Chrome for Testing 153, Playwright 1.63.0, WebKit 26.6.
- Firefox 155: 로컬 Windows에서 side-by-side 런타임 문제로 실행되지 않아 **Ubuntu GitHub Actions에서 검증**했습니다.
- 실제 macOS/iOS Safari는 사용하지 못했습니다. WebKit 테스트와 실제 Safari 테스트를 구분합니다.
- 성능 원자료: [performance.json](verification/performance.json). 공개 URL에서 새 브라우저 context로 측정한 실험실 LCP·CLS·리소스 크기입니다. CPU·네트워크 제한을 적용하지 않았으며 실제 방문자의 Core Web Vitals 통계가 아닙니다.
- 측정한 화면들의 CLS는 0이었습니다. 첫 연결 비용 때문에 LCP는 화면·측정 시점별로 차이가 납니다. 원자료를 기준으로 판단하며 Lighthouse 점수를 측정한 것으로 표현하지 않습니다.
- About에는 실행 JavaScript가 없고, 목록 보기 스크립트는 빌드 후 약 463자, YouTube 스크립트는 약 396자였습니다. 검색을 열기 전 Pagefind JS·WASM을 요청하지 않습니다.

## 배포 증거

첫 배포:

- 커밋: `7292cefb18c4e1918b1645ff7a7fb1c12189b06b`
- [Pages Actions 성공](https://github.com/zhdlxh48/mayb-log/actions/runs/34080970520)
- 공개 `revision.json`과 배포 커밋 일치 확인
- [교차 브라우저 CI 성공](https://github.com/zhdlxh48/mayb-log/actions/runs/34101638840)

최종 구현 코드의 검증:

- 커밋: `64281df1976bdf75d756f4c3da7e9d5524a458f2`
- [최종 구현 CI·Pages 배포 성공](https://github.com/zhdlxh48/mayb-log/actions/runs/34103027603): 기본 검사 13개, 콘텐츠 오류 16개와 빈 블로그, 브라우저 27개 통과
- 공개 사이트에서 추가로 Chromium·WebKit 18개 검사 통과: 검색·보기 유지·저장소 차단·영상 클릭·JS 없는 탐색·키보드·긴 콘텐츠·4개 viewport·Axe
- [29개 공개 경로 확인 결과](verification/deployment.json): 해당 커밋의 revision 일치, 한글 URL·검색 asset·RSS·Sitemap·404 확인
- [성능 원자료](verification/performance.json): 이 배포의 8개 화면에서 실험실 LCP 52–300ms, CLS 0. 제한 없는 실험실 측정이며 방문자 전체의 성능 수치로 일반화하지 않습니다.

이 검증 후의 인계 커밋은 보고서와 검증 원자료만 갱신합니다. 자기 자신의 커밋 ID를 파일 안에 기록할 수 없으므로 위 증거는 검증된 구현 커밋을 가리키며, 현재 배포된 문서 갱신 커밋은 [revision.json](https://zhdlxh48.github.io/mayb-log/revision.json)과 [Actions](https://github.com/zhdlxh48/mayb-log/actions)에서 확인합니다.

## 인계 후 권장 순서

1. [README](../README.md)대로 실행합니다.
2. About과 작성자 소개를 자신의 내용으로 바꿉니다.
3. 샘플 글을 지우고 [콘텐츠 가이드](CONTENT_GUIDE.md)대로 첫 글을 작성합니다.
4. `pnpm build`와 preview로 확인한 뒤 content 브랜치를 main에 병합합니다.
5. 기능 변경은 [유지보수 가이드](MAINTENANCE.md)의 파일 지도와 Git 흐름을 따릅니다.
