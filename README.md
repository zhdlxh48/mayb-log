# mayb-log

Astro와 Markdown/MDX로 만든 정적 개인 블로그입니다. About 홈과 Series·Category·Tag·Archive 인덱스를 제공하며, GitHub Pages 주소는 <https://zhdlxh48.github.io/mayb-log/>입니다.

## 시작하기

Node **24.20.0**, pnpm **11.25.0**을 사용합니다.

```sh
git clone https://github.com/zhdlxh48/mayb-log.git
cd mayb-log
pnpm install --frozen-lockfile
pnpm dev
```

개발 서버가 표시하는 `/mayb-log/` 주소를 엽니다. 검색은 제목·설명·본문·분류·시리즈·작성자 정보를 담은 정적 말뭉치와 Web Worker를 사용하므로 `pnpm build` 후 `pnpm preview`에서 최종 동작을 확인합니다.

## 명령

| 명령                                | 용도                              |
| ----------------------------------- | --------------------------------- |
| `pnpm dev`                          | 개발 서버 실행                    |
| `pnpm format` / `pnpm format:check` | Prettier 적용 / 검사              |
| `pnpm lint` / `pnpm lint:fix`       | ESLint 검사 / 자동 수정           |
| `pnpm check`                        | Astro와 TypeScript 검사           |
| `pnpm test`                         | 핵심 로직 단위 테스트             |
| `pnpm build`                        | `dist/` 정적 빌드                 |
| `pnpm test:build`                   | 링크·이미지·SEO·검색 산출물 검사  |
| `pnpm preview`                      | 빌드 결과 미리 보기               |
| `pnpm test:browser`                 | Chromium·Firefox·WebKit 회귀 검사 |

브라우저 바이너리는 최초 한 번 `pnpm exec playwright install chromium firefox webkit`으로 설치합니다. Linux CI와 같은 시스템 의존성이 필요하면 `--with-deps`를 추가합니다. 커밋할 때 Husky와 lint-staged가 변경 파일에 Prettier와 ESLint 자동 수정을 실행합니다.

## 콘텐츠 작성

글은 `src/content/posts/<id>/index.md` 또는 `index.mdx`로 만듭니다. 폴더 이름이 URL ID입니다.

```md
---
title: 나의 첫 기록
description: 글을 소개하는 한두 문장
authors: [owner]
publishedAt: 2026-09-07T18:00:00+09:00
tags: [기록]
categories: [일상]
draft: false
---

본문입니다.
```

일반 글은 Markdown을 권장합니다. 컴포넌트, `LinkPreview`, iframe이 필요할 때만 MDX를 사용합니다. iframe은 크기를 자동으로 강제하지 않으므로 YouTube 같은 영상에는 콘텐츠에서 `aspect-video w-full` 클래스를 지정합니다. 상세한 필드·이미지·MDX 예제는 [콘텐츠 가이드](docs/CONTENT_GUIDE.md)를 참고하세요.

사이트 이름과 주소는 `src/config/site.ts`, 소개는 `src/content/pages/about.md`, 작성자는 `src/content/authors/owner.yml`에서 수정합니다. 샘플 글 세 폴더와 사용하지 않는 `src/content/series/blog-notes.yml`은 자신의 글을 준비한 뒤 삭제할 수 있습니다. 글이 0개여도 빌드됩니다.

## 배포

`main` push와 수동 실행은 GitHub Actions에서 검사 순서를 모두 통과한 `dist/`를 Pages에 배포합니다. 기능 브랜치와 `dev`는 검증만 수행합니다. Settings → Pages → Source는 **GitHub Actions**로 둡니다. 상태는 [Actions](https://github.com/zhdlxh48/mayb-log/actions)에서 확인합니다.

## 문서

- [콘텐츠 가이드](docs/CONTENT_GUIDE.md)
- [유지보수 가이드](docs/MAINTENANCE.md)
- [리팩터링 완료 보고서](docs/IMPLEMENTATION_REPORT.md)
- [요구사항 대조표](docs/REQUIREMENTS.md)
- [현재 리팩터링 기준](docs/REFACTORING_ROADMAP.txt)
- [감사 후 수정 기준](docs/FIX_AFTER_AUDIT_ROADMAP.txt)
- [초기 개발 로드맵(역사 문서)](docs/DEVELOPMENT_ROADMAP.txt)
