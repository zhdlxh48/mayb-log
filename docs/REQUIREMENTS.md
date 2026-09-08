# 리팩터링 요구사항 대조표

| 영역                               | 구현 위치                                       | 검증                                        |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Tailwind 중심 스타일·최소 전역 CSS | `src/styles/global.css`, Astro 컴포넌트         | format, lint, 6개 폭 브라우저 검사          |
| 본문·목차 중앙 정렬                | `BaseLayout.astro`, `PostLayout.astro`          | 1920·2560px 실제 콘텐츠 영역 중심 검사      |
| Markdown와 MDX 컬렉션              | `src/content.config.ts`, `astro.config.mjs`     | check, 실제 `.mdx` build                    |
| 공통 본문 서식                     | `ArticleProse.astro`                            | Markdown·MDX 페이지 브라우저 검사           |
| directive 완전 제거                | 설정·소스·샘플·의존성 삭제                      | 산출물 금지 문자열 검사                     |
| 직접 iframe·LinkPreview            | MDX 콘텐츠, `ArticleProse.astro`                | 기능 존재 시 lazy/title/preview/이미지 검사 |
| FlexSearch 부분 문자열 검색        | `search.ts`, `search.worker.ts`, `search.astro` | 영어·한글 중간 문자열 단위/브라우저 검사    |
| 검색 전용 말뭉치                   | `search-data.astro`, `search-text.ts`           | 전체 필드, 노이즈 제외, raw/gzip 크기 기록  |
| 검색 실패 재시도                   | `search.astro`                                  | 같은 페이지에서 실패 후 성공 검사           |
| 검색 자산 격리                     | Search 페이지의 script와 worker                 | About·게시글 네트워크 요청 검사             |
| Pagefind 제거                      | 패키지·명령·public 파일 삭제                    | dist 이름·HTML hook 부재 검사               |
| 루트 scripts 제거                  | `scripts/` 삭제                                 | 저장소 파일 목록 검사                       |
| 콘텐츠 독립 표준 테스트            | `tests/**/*.test.ts`                            | 생성 경로 동적 탐색, 빈 블로그 통과         |
| ESLint·Prettier·pre-commit         | root config, `.husky/pre-commit`                | format:check, lint                          |
| 단순 CI·Pages 유지                 | `.github/workflows/ci.yml`                      | branch/main Actions와 공개 배포             |
| SEO 보강                           | `BaseHead.astro`, `PostLayout.astro`            | article 시간·Twitter meta 산출물 검사       |
| 문서 갱신                          | README와 `docs/`                                | 제거된 명령·기능 참조 검색                  |
| ArticleProse scoped CSS            | `ArticleProse.astro`                            | 산출 CSS·semantic style 브라우저 검사       |
| 독립 MDX 컴포넌트 경계             | `.not-prose`, 샘플 `LinkPreview`                | build·computed style 브라우저 검사          |
| 검색 종류·중복 없는 말뭉치         | `search-data.astro`, `search-text.ts`           | 종류·필드 범위 단위 및 build 검사           |
| All 요약·필터 count·More           | `search.astro`, `search-view.ts`                | 82개 합성 말뭉치 브라우저 검사              |
| 20개 페이지·고정 10페이지 블록     | `search-view.ts`, `search.astro`                | 47페이지 순수 함수·브라우저 검사            |
| 전체 결과·URL History 복원         | `search.ts`, Worker, `search.astro`             | 65개 결과·직접 URL·Back/Forward 검사        |

초기 요구사항은 [DEVELOPMENT_ROADMAP.txt](DEVELOPMENT_ROADMAP.txt), 리팩터링 기준은 [REFACTORING_ROADMAP.txt](REFACTORING_ROADMAP.txt)에 보존했습니다. 감사 보정은 [FIX_AFTER_AUDIT_ROADMAP.txt](FIX_AFTER_AUDIT_ROADMAP.txt), 현재 추가 개선 기준은 [FIX_ADDITIONAL_ROADMAP.txt](FIX_ADDITIONAL_ROADMAP.txt)입니다.
