# 콘텐츠 작성 가이드

## 콘텐츠가 있는 곳

| 종류 | 경로 | ID |
| --- | --- | --- |
| 글 | `src/content/posts/<id>/index.md` | 폴더 이름 |
| 작성자 | `src/content/authors/<id>.yml` | 파일 이름 |
| 시리즈 | `src/content/series/<id>.yml` | 파일 이름 |
| About | `src/content/pages/about.md` | `about` |

영문 소문자와 하이픈으로 글 폴더 이름을 정하면 관리하기 편합니다. 발행 후 이름을 바꾸면 URL도 바뀝니다. Markdown 파일을 글 폴더 바로 아래의 `index.md`로 저장하세요.

## 게시글 Frontmatter

파일 맨 위 `---` 사이가 메타데이터입니다. 그 아래는 일반 Markdown 본문입니다.

```yaml
---
title: 제목
subtitle: 선택적인 부제목
description: 검색과 목록에 사용하는 명시적인 설명
authors: [owner]
publishedAt: 2026-09-07T18:00:00+09:00
updatedAt: 2026-09-08T09:00:00+09:00
tags: [Astro, 글쓰기]
categories: [개발]
series: blog-notes
seriesOrder: 3
thumbnail: ./images/photo.jpg
thumbnailAlt: 사진 속 내용을 설명하는 문장
lang: ko
draft: false
seo:
  title: 검색 결과에 사용할 별도 제목
  description: 검색 결과에 사용할 별도 설명
  noindex: false
---
```

필수는 `title`, `description`, `authors`(최소 1명), `publishedAt`입니다. 나머지는 필요할 때만 넣습니다. `thumbnail`이 있으면 `thumbnailAlt`, `series`가 있으면 양의 정수 `seriesOrder`가 필요합니다. `updatedAt`은 발행일보다 빠를 수 없습니다. 같은 시리즈에서 순서를 중복 사용하면 빌드가 실패합니다.

기본값은 `tags: []`, `categories: []`, `lang: ko`, `draft: false`, `seo.noindex: false`입니다. 선택 필드를 사용하지 않으면 줄을 삭제하세요. 빈 문자열로 남기지 않습니다.

### 날짜·공개 상태

날짜는 위 예처럼 `+09:00`을 포함해 쓰는 것을 권장합니다. 날짜 표시와 연·월 Archive는 **Asia/Seoul** 기준입니다. `2026-08-31T15:00:00Z`는 한국에서 9월 1일이므로 9월 Archive에 들어갑니다.

- `draft: true`: 글 URL·목록·개수·검색·RSS·Sitemap에서 제외합니다. 초안의 메타데이터와 Markdown 오류도 수정해야 빌드됩니다.
- `seo.noindex: true`: 공개 글입니다. 목록·검색·RSS에는 보이고, robots meta를 설정하며 Sitemap에서는 제외합니다. 비밀 글이나 접근 제한 용도가 아닙니다.
- 미래 날짜 + `draft: false`: 즉시 공개합니다. 예약 발행 기능은 없습니다.

### 작성자

`src/content/authors/owner.yml`:

```yaml
name: MayB
bio: 개발과 일상의 기록
homepage: https://github.com/zhdlxh48
sameAs:
  - https://github.com/zhdlxh48
# avatar: ./images/profile.jpg
```

`name`만 필수입니다. 다른 작성자는 새 YAML 파일을 만들고 `authors: [owner, guest]`처럼 참조합니다. 존재하지 않거나 중복된 작성자 ID는 오류입니다. 아바타 경로는 작성자 YAML을 기준으로 합니다. 홈페이지와 `sameAs`는 HTTP(S) 주소를 사용합니다. RSS는 이메일 없이 작성자 이름을 `dc:creator`로 제공합니다.

### 시리즈·태그·카테고리

`src/content/series/blog-notes.yml`:

```yaml
title: 블로그 개발 노트
description: 블로그를 만드는 과정을 기록합니다.
order: 10
```

Sidebar에서 시리즈는 `order`, 제목 순입니다. 시리즈 안 글은 `seriesOrder` 순이고, 나머지 모든 목록은 발행일 최신순입니다. 발행일이 같으면 게시글 ID로 순서를 고정합니다. 공개 글이 없는 시리즈는 탐색 목록에서 제외됩니다.

태그와 카테고리는 별도 파일이 없습니다. 글의 `tags`, `categories`를 수정하면 URL과 개수가 자동 생성됩니다. 같은 이름은 재사용하며 대소문자도 일관되게 쓰세요. `Astro`와 `astro`, `C++`와 `C#`처럼 서로 다른 이름이 같은 URL을 만들면 빌드 오류가 납니다. 한글 이름도 사용할 수 있습니다.

## 본문과 링크

제목은 레이아웃에서 `<h1>`로 출력하므로 본문은 `##`부터 시작합니다. `##`, `###`는 목차에 자동 반영됩니다. 표·체크박스·취소선은 GFM, 코드 색상은 Astro 기본 Shiki를 사용합니다.

````md
## 예제

**강조**, *기울임*, ~~취소선~~

- [x] 완료
- [ ] 예정

```ts
const message = '안녕하세요';
```

[전체 글](/posts/)
[기록 태그](/tags/기록/)
[이 문서 소제목](#예제)
````

`/posts/`처럼 루트부터 쓰는 내부 링크에는 `/mayb-log/`가 자동으로 붙습니다. 이미 붙어 있으면 중복 추가하지 않습니다. 외부 링크는 기본적으로 같은 탭에서 열립니다. 배포할 수 없는 내부 링크·없는 anchor는 `pnpm build`의 산출물 검사에서 알려 줍니다.

## 이미지

원본은 Git에 보관합니다. 별도 압축 CLI를 실행할 필요가 없습니다.

```md
![사진에 대한 구체적인 설명](./images/photo.jpg)
```

본문 이미지의 설명은 필수입니다. 썸네일은 본문의 첫 이미지와 별도로 Frontmatter에서 지정합니다. 썸네일을 생략하면 빈 이미지 영역 없이 글을 표시합니다.

- 래스터 출력: WebP, quality 80, effort 6. 가로·세로 중 긴 변 최대 1600px.
- 원본보다 큰 파생 이미지를 만들지 않습니다. 세로 사진에도 같은 규칙을 적용합니다.
- 반응형 후보: 480·768·1024·1280·1600 중 원본에 맞는 폭과 원본을 제한한 최대 폭.
- SVG: 벡터 파일을 그대로 유지합니다. AVIF를 생성하지 않습니다.
- OG: 래스터 썸네일을 최대 1200×630으로 자릅니다. 작은 사진은 확대하지 않아 OG도 작습니다. SVG나 썸네일 없는 글은 OG/JSON-LD 이미지를 생략합니다.

외부 이미지 대신 글 폴더의 로컬 이미지를 쓰면 크기·포맷 정책과 빌드 재현성을 유지하기 쉽습니다.

## 7종 directive

**속성은 여는 줄 하나에 모두 적습니다.** 내용이 있는 `callout`, `figure`, `details`는 `:::`, 나머지는 `::`로 시작합니다. 잘못된 이름·필수 속성 누락·지원하지 않는 값은 파일명과 원인을 표시하며 빌드를 실패시킵니다.

```md
:::callout{type="tip" title="알아두기"}
일반 Markdown 본문입니다.
:::

:::figure{caption="사진 설명" credit="MayB"}
![이미지 설명](./images/photo.jpg)
:::

::social{platform="github" url="https://github.com/zhdlxh48" label="GitHub에서 보기"}

::youtube{id="aqz-KE-bpKQ" title="Big Buck Bunny"}

::link-card{url="https://docs.astro.build/" title="Astro 문서" description="공식 개발 문서"}

::metric{label="읽은 책" value="3" unit="권" status="neutral"}

:::details{summary="자세히 보기"}
추가 설명입니다.
:::
```

| 종류 | 속성 |
| --- | --- |
| callout | `type`: note(기본)·info·tip·warning·danger, `title` 선택 |
| figure | `caption`, `credit` 선택. 내부 이미지는 일반 Markdown |
| social | `platform`, `url`, `label` 필수. x·instagram·github·bluesky·mastodon·generic |
| youtube | 11자리 `id`, `title` 필수 |
| link-card | `url`, `title` 필수, `description` 선택 |
| metric | `label`, `value` 필수. `unit` 선택, `status`: good·warning·bad·neutral(기본) |
| details | `summary` 필수 |

YouTube는 클릭 전 iframe을 만들지 않습니다. JavaScript가 없어도 원본 영상 링크가 남습니다. Social·Link Card는 입력한 제목과 설명만 출력하며 외부 메타데이터를 수집하지 않습니다.

중첩 details는 **바깥쪽 콜론을 더 길게** 씁니다.

```md
::::details{summary="바깥 설명"}
:::details{summary="안쪽 설명"}
내용
:::
::::
```

## 샘플 삭제와 발행

1. `content/my-first-post` 브랜치를 최신 `main`에서 만듭니다.
2. 샘플 3개 폴더를 삭제하거나 자신의 글로 바꿉니다. `about.md`는 자신의 소개로 수정합니다.
3. 사용하지 않는 시리즈 YAML을 지웁니다. 작성자 YAML은 참조하는 글이 있으면 유지합니다.
4. `pnpm test`, `pnpm build`, `pnpm preview`로 확인합니다. 인수 검사 샘플 관리 방법은 유지보수 가이드에 있습니다.
5. `content/` 브랜치를 `main`에 직접 병합하고 push합니다. Actions 성공과 공개 URL을 확인합니다.
