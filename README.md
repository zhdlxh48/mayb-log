# mayb-log

Astro와 Markdown으로 만든 개인 블로그입니다. 홈은 About이고, 왼쪽 Index에서 시리즈·카테고리·태그·날짜별로 글을 찾습니다. 모바일에서는 Index를 펼쳐 탐색합니다.

사이트: **https://zhdlxh48.github.io/mayb-log/**

## 시작하기

Node **24.20.0**, pnpm **11.25.0**을 사용합니다. `.node-version`, `package.json`, CI가 같은 버전을 가리킵니다.

```sh
git clone https://github.com/zhdlxh48/mayb-log.git
cd mayb-log
pnpm install --frozen-lockfile
pnpm dev
```

개발 서버의 `/mayb-log/`를 엽니다. 기본 주소는 `http://localhost:4321/mayb-log/`입니다. Astro가 터미널에 표시하는 주소를 우선 확인하세요.

검색 인덱스는 빌드할 때 생성됩니다. **검색 검증에는 `pnpm build` 후 `pnpm preview`를 사용**하세요. 개발 서버에서 인덱스가 없다는 오류는 배포된 검색의 오류와 다릅니다.

## 자주 쓰는 명령

| 명령 | 용도 |
| --- | --- |
| `pnpm dev` | Markdown과 코드를 수정하며 미리 보기 |
| `pnpm check` | Astro·TypeScript 검사 |
| `pnpm test` | 날짜·분류·directive·이미지·SEO 로직 검사 |
| `pnpm build` | 타입 검사 → 정적 빌드 → Pagefind → 산출물 검사 |
| `pnpm preview` | `dist/`의 실제 배포 결과 미리 보기 |
| `pnpm search:index` | 기존 `dist/`로 검색 인덱스만 다시 생성 |
| `pnpm check:build` | 기존 빌드의 링크·이미지·SEO 검사 |
| `pnpm test:content` | 격리된 복사본에서 잘못된 콘텐츠·빈 블로그 검사 |
| `pnpm test:browser` | 빌드 결과를 Chromium·Firefox·WebKit으로 검사 |

브라우저 검사는 최초 한 번 `pnpm exec playwright install chromium firefox webkit`을 실행한 뒤 사용합니다. Linux에서는 `--with-deps`를 추가할 수 있습니다. `pnpm test:content`가 만든 별도 테스트 사이트를 `pnpm test:browser`가 검사합니다. 실제 콘텐츠를 바꾸어도 테스트용 글은 유지됩니다.

## 첫 글 작성

`src/content/posts/my-first-post/index.md`를 만듭니다. **폴더 이름이 URL의 게시글 ID**입니다.

```md
---
title: 나의 첫 기록
description: 이 글에서 다룰 내용을 한두 문장으로 적습니다.
authors: [owner]
publishedAt: 2026-09-07T18:00:00+09:00
tags: [기록]
categories: [일상]
draft: false
---

첫 문단입니다.

## 소제목

본문을 작성합니다.
```

이미지는 같은 폴더의 `images/`에 원본을 넣고 `![이미지 설명](./images/photo.jpg)`로 사용합니다. 썸네일·작성자·시리즈·7종 directive 예제는 [콘텐츠 가이드](docs/CONTENT_GUIDE.md)에 있습니다.

## 내 블로그로 바꾸기

- 소개: `src/content/pages/about.md`의 본문 수정. About 파일 자체는 유지합니다.
- 작성자: `src/content/authors/owner.yml`의 이름·소개·링크 수정.
- 사이트 이름·설명: `src/config/site.ts` 수정.
- 샘플 삭제: `src/content/posts/first-note/`, `markdown-notes/`, `archive-note/` 폴더 삭제. 불필요한 `src/content/series/blog-notes.yml`도 삭제할 수 있습니다. 글이 0개여도 빌드됩니다.

CI의 인수 검사는 별도 콘텐츠를 자동 생성하므로 실제 샘플을 삭제해도 됩니다. 자세한 내용은 [유지보수 가이드](docs/MAINTENANCE.md#샘플을-삭제할-때의-테스트)에 있습니다.

## 배포

`main`에 push하면 GitHub Actions가 검사·빌드·브라우저 검증을 마친 `dist/` 전체를 Pages에 배포합니다. 기능 브랜치와 `dev`는 검증만 실행합니다. 저장소 Settings → Pages → Source는 **GitHub Actions**입니다.

[Actions 실행 결과](https://github.com/zhdlxh48/mayb-log/actions)에서 `Verify and deploy`의 `build`, `deploy`가 성공했는지 확인하세요. 수동 배포는 Actions → Run workflow → `main`입니다. 토큰이나 별도 배포 서버는 필요하지 않습니다.

## 더 읽기

- [콘텐츠 가이드](docs/CONTENT_GUIDE.md): Frontmatter, 날짜, 이미지, directive
- [유지보수 가이드](docs/MAINTENANCE.md): 구조, 기능 추가, Git 흐름, 의존성 갱신, 복구
- [개발 보고서](docs/IMPLEMENTATION_REPORT.md): 구현 과정과 검증 근거
- [요구사항 대조표](docs/REQUIREMENTS.md): 로드맵 0–115의 구현 위치
- [원문 로드맵](docs/DEVELOPMENT_ROADMAP.txt), [확정한 변경 사항](docs/DECISIONS.md)
