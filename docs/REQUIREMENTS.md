# 리팩터링 요구사항 대조표

| 영역                               | 구현 위치                                       | 검증                                     |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Tailwind 중심 스타일·최소 전역 CSS | `src/styles/global.css`, Astro 컴포넌트         | format, lint, 4개 폭 브라우저 검사       |
| 본문·목차 중앙 정렬                | `PostLayout.astro`, `PostToc.astro`             | 1440px 위치 검사, overflow 검사          |
| Markdown와 MDX 컬렉션              | `src/content.config.ts`, `astro.config.mjs`     | check, 실제 `.mdx` build                 |
| 공통 본문 서식                     | `ArticleProse.astro`                            | Markdown·MDX 페이지 브라우저 검사        |
| directive 완전 제거                | 설정·소스·샘플·의존성 삭제                      | 산출물 금지 문자열 검사                  |
| 직접 iframe·LinkPreview            | `markdown-notes/index.mdx`                      | lazy/title/LinkPreview/이미지 검사       |
| FlexSearch 부분 문자열 검색        | `search.ts`, `search.worker.ts`, `search.astro` | 영어·한글 중간 문자열 단위/브라우저 검사 |
| 검색 전용 말뭉치                   | `search-data.astro`                             | draft 제외, noindex 포함, 크기 검사      |
| 검색 자산 격리                     | Search 페이지의 script와 worker                 | About 네트워크 요청 검사                 |
| Pagefind 제거                      | 패키지·명령·public 파일 삭제                    | dist 이름·HTML hook 부재 검사            |
| 루트 scripts 제거                  | `scripts/` 삭제                                 | 저장소 파일 목록 검사                    |
| 표준 테스트 구조                   | `tests/**/*.test.ts`                            | test, test:build, test:browser           |
| ESLint·Prettier·pre-commit         | root config, `.husky/pre-commit`                | format:check, lint                       |
| 단순 CI·Pages 유지                 | `.github/workflows/ci.yml`                      | branch/main Actions와 공개 배포          |
| SEO 보강                           | `BaseHead.astro`, `PostLayout.astro`            | article 시간·Twitter meta 산출물 검사    |
| 문서 갱신                          | README와 `docs/`                                | 제거된 명령·기능 참조 검색               |

초기 요구사항은 [DEVELOPMENT_ROADMAP.txt](DEVELOPMENT_ROADMAP.txt)에 역사 문서로 보존했습니다. 현재 구현 기준은 [REFACTORING_ROADMAP.txt](REFACTORING_ROADMAP.txt)입니다.
