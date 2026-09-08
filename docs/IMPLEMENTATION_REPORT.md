# 리팩터링 완료 보고서

## 결과

2026-09-07에 `REFACTORING_ROADMAP.txt`를 기준으로 기존 블로그를 단순화했습니다. 화면의 무채색·muted blue 문서형 인상과 콘텐츠 모델은 유지하면서 스타일, Markdown 확장, 검색, 테스트와 개발 도구를 교체했습니다.

## 변경 내용

- 전역 CSS를 Tailwind import·테마 토큰·포커스 규칙으로 줄이고 화면 스타일을 Astro 컴포넌트의 유틸리티 클래스로 옮겼습니다.
- Markdown/MDX 본문 규칙은 `ArticleProse.astro` 한 곳에서 관리합니다.
- 게시글 본문과 목차를 하나의 최대 폭 컨테이너 안에서 가운데 정렬하고 1280px 이상에서 목차를 sticky로 배치했습니다.
- posts와 pages가 `.md`와 `.mdx`를 함께 읽습니다. MDX는 공식 `@astrojs/mdx` 통합을 사용하고 기존 링크·이미지 처리 설정을 상속합니다.
- 자체 directive와 YouTube 보강 스크립트를 삭제했습니다. 표준 HTML, MDX iframe, `astro-embed`의 `LinkPreview` 예제로 교체했습니다.
- Pagefind와 루트 `scripts/`를 삭제했습니다. 검색 페이지가 첫 입력 때 검색 전용 HTML 말뭉치와 FlexSearch Web Worker를 가져옵니다.
- 테스트를 `tests/unit`, `tests/build`, `tests/browser`로 정리하고 모든 진입 파일을 `*.test.ts`로 통일했습니다.
- ESLint flat config, Prettier, Husky, lint-staged를 추가하고 CI 순서를 단순화했습니다.
- article 시간 meta와 Twitter Card meta를 기존 데이터만으로 추가했습니다.

## 감사 후 보정

- 초광폭 화면에서 최대 폭 컨테이너가 콘텐츠 열의 왼쪽에 붙던 원인은 `max-width`에 자동 좌우 여백이 없었기 때문입니다. 공통 콘텐츠 컨테이너와 main에 `mx-auto`를 적용해 1920px와 2560px에서도 264px Sidebar를 제외한 실제 영역의 중심과 게시글 중심이 2px 이내로 일치하게 했습니다.
- 검색 문자열 조합을 `src/lib/search-text.ts`의 작은 순수 함수로 분리했습니다. 게시글 제목, 부제목, description, 렌더링된 본문, 태그, 카테고리, 시리즈 제목, 작성자 이름을 포함하며 script·style·template·noscript·숨긴 구현 노드는 제외합니다.
- 검색 말뭉치 요청이 실패했을 때 거부된 Promise를 비워 같은 페이지에서 다시 입력하면 요청과 Worker 초기화를 재시도합니다.
- 공통 iframe 서식에서 강제 16:9 비율과 전체 너비를 제거했습니다. YouTube 샘플이 필요한 두 클래스는 해당 MDX iframe에 직접 지정해 다른 지도·차트·위젯의 크기를 보존합니다.
- 빌드와 브라우저 검사는 생성된 글·분류 경로와 검색 데이터를 동적으로 찾습니다. 샘플 ID·분류 이름·글 개수와 500KB 상한을 제거했으며 글이 없는 저장소에서도 정상 종료합니다.
- Astro의 이전 콘텐츠 이미지 캐시가 삭제한 샘플 경로를 참조하지 않도록 표준 build 명령은 `astro build --force`로 콘텐츠 캐시를 먼저 갱신합니다.
- 사용하지 않는 직접 개발 의존성 `@types/mdast`를 제거하고 lint-staged의 Prettier 대상에 CSS를 추가했습니다.

## 추가 본문 스타일·검색 개선

2026-09-08에 `FIX_ADDITIONAL_ROADMAP.txt`를 반영했습니다.

- `ArticleProse.astro`의 긴 Tailwind descendant class를 컴포넌트 scoped CSS로 옮겼습니다. 본문 수치와 테마 변수는 유지하고, Markdown 요소별 규칙과 `.not-prose` 제외 조건을 한 파일에서 읽을 수 있게 정리했습니다.
- 샘플 `LinkPreview`를 `.not-prose`로 감싸 독립 컴포넌트 내부 링크·문단·이미지에 본문 CSS가 들어가지 않도록 했습니다. iframe 공통 규칙은 여백·테두리·최대 너비만 유지합니다.
- 검색 문서에 About·Post·Series·Category·Tag·Author·Archive 종류를 추가하고, 인덱스 문서가 하위 게시글 제목을 검색 문자열에 복사하던 중복을 제거했습니다. Archive에는 연도와 월 문서를 각각 제공합니다.
- All은 종류별 최대 10개를 보여 주는 요약이며 결과가 더 있을 때만 More를 표시합니다. 개별 필터는 20개씩 나누고 페이지 번호는 고정 10페이지 블록을 사용합니다.
- 검색 결과 50개 제한을 없애고 한 번 받은 relevance 순서를 필터와 페이지에서 그대로 재사용합니다. `q`, `type`, `page` URL 상태와 직접 진입, 뒤로가기·앞으로가기를 지원합니다.
- 검색 집계와 페이지 계산은 `search-view.ts`의 작은 순수 함수로 분리해 UI와 단위 테스트가 같은 규칙을 사용합니다.

추가 변경의 로컬 검증에서는 format·lint·Astro check, 단위 테스트 18개, 25페이지 production build와 build test가 통과했습니다. Chromium과 WebKit에서 각각 13개씩 총 26개 시나리오가 통과했으며 여섯 화면 폭의 수평 overflow와 axe WCAG 검사를 포함합니다. 82개 합성 검색 결과와 65개 동일 종류 결과로 요약·필터·URL History를 확인하고, 순수 함수에서는 총 47페이지의 고정 블록 이동을 검사했습니다.

현재 검색 말뭉치는 13,905 bytes이고 gzip으로 4,488 bytes입니다. Search 페이지 스크립트는 60,007 bytes, Worker는 50,687 bytes, ArticleProse CSS는 4,173 bytes이며 이미지 파생 파일을 포함한 `dist/` 전체는 643,602 bytes입니다. 로컬 Firefox는 기존 Windows 환경의 `spawn UNKNOWN` 오류로 실행 파일이 시작되지 않아, Linux GitHub Actions 결과로 최종 판정합니다. 실제 Safari 장비 대신 Playwright WebKit을 사용했습니다.

## 검증

로컬에서 다음을 확인했습니다.

| 검사                | 결과                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `pnpm format:check` | 통과                                                                    |
| `pnpm lint`         | 통과                                                                    |
| `pnpm check`        | 오류 없음                                                               |
| `pnpm test`         | 13개 통과                                                               |
| `pnpm build`        | 25개 정적 페이지 빌드                                                   |
| `pnpm test:build`   | 25개 HTML, 내부 참조 1,376개, 이미지·SEO·RSS·Sitemap·MDX·검색 검사 통과 |
| Chromium·WebKit     | 22개 브라우저 조합 통과, 375·768·1024·1440·1920·2560px 및 axe 검사 포함 |

현재 샘플 기준 검색 말뭉치는 14,362 bytes이며 gzip으로 4,457 bytes입니다. 근거 없는 500KB 실패 기준은 제거하고 build test에서 두 크기를 계속 출력합니다. FlexSearch worker는 50,651 bytes, 공통 BaseLayout CSS는 20,645 bytes입니다. `dist/` 전체는 이미지 파생 파일을 포함해 594,959 bytes입니다. axe의 WCAG 2 A·AA·2.1 AA 규칙은 검사한 여섯 화면 폭과 주요 경로에서 위반이 없었습니다.

샘플 글 세 폴더를 모두 임시로 치운 clean content cache에서도 10개 정적 페이지 build와 build test, Chromium 브라우저 테스트 11개가 통과했습니다. 검증 뒤 샘플 콘텐츠를 원상 복구했습니다.

로컬 Firefox 바이너리는 Windows side-by-side 런타임 오류로 시작되지 않았습니다. 테스트 코드나 사이트 오류가 아니며 Linux GitHub Actions에서 Firefox를 포함한 세 브라우저 결과를 최종 판정합니다. 실제 Safari 장비 검사는 수행하지 않았고 Playwright WebKit으로 회귀 검사를 대신했습니다.

최종 branch·main CI, Pages 배포와 공개 URL 확인 결과는 해당 GitHub Actions 실행과 작업 완료 보고에 기록합니다.

## 유지보수 기준

일반 콘텐츠는 Markdown으로 작성하고 컴포넌트가 꼭 필요한 글만 MDX를 사용합니다. 스타일은 해당 컴포넌트에서 읽을 수 있는 Tailwind 유틸리티로 수정하며, Markdown/MDX 출력 태그는 `ArticleProse.astro`에서 관리합니다. 검색과 콘텐츠 집계의 세부 흐름은 [유지보수 가이드](MAINTENANCE.md)에 설명했습니다.
