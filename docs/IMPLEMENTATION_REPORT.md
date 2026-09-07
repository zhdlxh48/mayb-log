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

## 검증

로컬에서 다음을 확인했습니다.

| 검사                | 결과                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `pnpm format:check` | 통과                                                                    |
| `pnpm lint`         | 통과                                                                    |
| `pnpm check`        | 오류 없음                                                               |
| `pnpm test`         | 11개 통과                                                               |
| `pnpm build`        | 25개 정적 페이지 빌드                                                   |
| `pnpm test:build`   | 25개 HTML, 내부 참조 1,376개, 이미지·SEO·RSS·Sitemap·MDX·검색 검사 통과 |
| Chromium·WebKit     | 22개 브라우저 조합 통과, 375·768·1024·1440px 및 axe 검사 포함           |

현재 샘플 기준 검색 말뭉치는 13,524 bytes, FlexSearch worker는 50,651 bytes, 공통 CSS는 20,659 bytes입니다. `dist/` 전체는 이미지 파생 파일을 포함해 592,004 bytes입니다. axe의 WCAG 2 A·AA·2.1 AA 규칙은 검사한 네 화면 폭과 주요 네 경로에서 위반이 없었습니다.

로컬 Firefox 바이너리는 Windows side-by-side 런타임 오류로 시작되지 않았습니다. 테스트 코드나 사이트 오류가 아니며 Linux GitHub Actions에서 Firefox를 포함한 세 브라우저 결과를 최종 판정합니다. 실제 Safari 장비 검사는 수행하지 않았고 Playwright WebKit으로 회귀 검사를 대신했습니다.

최종 branch·main CI, Pages 배포와 공개 URL 확인 결과는 해당 GitHub Actions 실행과 작업 완료 보고에 기록합니다.

## 유지보수 기준

일반 콘텐츠는 Markdown으로 작성하고 컴포넌트가 꼭 필요한 글만 MDX를 사용합니다. 스타일은 해당 컴포넌트에서 읽을 수 있는 Tailwind 유틸리티로 수정하며, Markdown/MDX 출력 태그는 `ArticleProse.astro`에서 관리합니다. 검색과 콘텐츠 집계의 세부 흐름은 [유지보수 가이드](MAINTENANCE.md)에 설명했습니다.
