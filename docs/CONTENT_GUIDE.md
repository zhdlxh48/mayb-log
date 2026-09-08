# 콘텐츠 작성 가이드

## 파일과 ID

| 종류   | 경로                                               | ID        |
| ------ | -------------------------------------------------- | --------- |
| 글     | `src/content/posts/<id>/index.md` 또는 `index.mdx` | 폴더 이름 |
| 작성자 | `src/content/authors/<id>.yml`                     | 파일 이름 |
| 시리즈 | `src/content/series/<id>.yml`                      | 파일 이름 |
| About  | `src/content/pages/about.md` 또는 `.mdx`           | `about`   |

한 글 폴더에는 `index.md`와 `index.mdx` 중 하나만 둡니다. 일반 글은 읽기 쉬운 Markdown을 사용하고 Astro 컴포넌트가 필요할 때만 MDX를 선택합니다.

## Frontmatter

```yaml
---
title: 제목
subtitle: 선택적인 부제목
description: 검색과 목록에 쓰는 설명
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
  title: 선택적인 SEO 제목
  description: 선택적인 SEO 설명
  noindex: false
---
```

필수 필드는 `title`, `description`, `authors`, `publishedAt`입니다. 썸네일에는 `thumbnailAlt`, 시리즈에는 양의 정수 `seriesOrder`가 함께 있어야 합니다. `updatedAt`은 발행일보다 빠를 수 없고 같은 시리즈의 순서는 중복할 수 없습니다.

- `draft: true`는 경로·목록·개수·검색·RSS·Sitemap에서 제외됩니다.
- `seo.noindex: true`는 공개 목록·검색·RSS에는 포함되고 Sitemap에서는 빠집니다.
- 미래 날짜도 `draft: false`이면 바로 공개됩니다.
- 날짜 표시와 Archive 그룹은 Asia/Seoul 기준입니다.
- 검색은 제목, 부제목, description, 렌더링된 본문, 태그, 카테고리, 시리즈 제목, 작성자 이름을 대상으로 합니다.

## 작성자와 분류

작성자는 YAML로 관리합니다.

```yaml
name: MayB
bio: 개발과 일상의 기록
homepage: https://github.com/zhdlxh48
sameAs:
  - https://github.com/zhdlxh48
```

시리즈는 제목과 선택적인 설명·정렬 순서를 가집니다. 태그와 카테고리는 글의 배열에서 자동 생성됩니다. 대소문자와 표기를 일관되게 사용하세요. 서로 다른 이름이 같은 URL slug가 되면 빌드가 실패합니다.

## Markdown

본문 제목은 `##`부터 시작합니다. `##`와 `###`가 목차에 들어가며 GFM 표·체크박스·취소선과 Shiki 코드 강조를 지원합니다. 루트 내부 링크에는 배포 base `/mayb-log/`가 자동 적용됩니다.

````md
## 예제

- [x] 완료
- [ ] 예정

```ts
const message = '안녕하세요';
```

[전체 글](/posts/)
````

접는 내용과 그림 설명은 HTML 표준 요소를 직접 사용할 수 있습니다.

```html
<details>
  <summary>자세히 보기</summary>
  <p>추가 설명입니다.</p>
</details>
```

## MDX

링크 미리보기는 공식 `astro-embed` 컴포넌트를 직접 가져옵니다.

```mdx
import { LinkPreview } from 'astro-embed';

<div class="not-prose">
  <LinkPreview id="https://astro.build/" />
</div>
```

`not-prose` 경계 안의 독립 컴포넌트에는 본문용 `p`, `a`, `img` 스타일이 적용되지 않습니다.

영상은 제공자가 안내하는 iframe을 직접 넣고 `title`과 `loading="lazy"`를 지정합니다. 공통 본문 스타일은 iframe의 비율과 너비를 강제하지 않습니다. YouTube처럼 반응형 16:9 영상이 필요하면 아래처럼 `aspect-video w-full`을 글에 명시합니다.

```mdx
<iframe
  class="aspect-video w-full"
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
  title="영상 제목"
  loading="lazy"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
/>
```

다른 지도·차트·위젯은 제공자가 요구하는 `width`, `height` 또는 클래스를 그대로 지정할 수 있습니다. MDX도 Markdown과 같은 내부 링크·로컬 이미지 처리 설정을 상속합니다. 별도 클라이언트 hydration 지시자는 필요하지 않습니다.

## 이미지

원본은 글 폴더의 `images/`에 두고 대체 텍스트를 반드시 씁니다.

```md
![사진을 구체적으로 설명하는 문장](./images/photo.jpg)
```

래스터 이미지는 WebP quality 80, effort 6으로 변환합니다. 긴 변은 최대 1600px이고 원본보다 키우지 않습니다. SVG는 그대로 유지합니다. 반응형 폭 후보는 480·768·1024·1280·1600입니다. 래스터 썸네일의 OG 이미지는 최대 1200×630이며 작은 원본은 확대하지 않습니다. SVG 또는 썸네일이 없는 글은 OG/JSON-LD 이미지를 생략합니다.

## 샘플 교체

1. 최신 `main`에서 `content/<작업명>` 브랜치를 만듭니다.
2. 샘플 글 세 폴더를 삭제하거나 자신의 글로 바꿉니다.
3. 사용하지 않는 시리즈 YAML을 삭제하고 About·작성자 정보를 수정합니다.
4. `pnpm check && pnpm test && pnpm build && pnpm test:build`를 실행합니다.
5. `content/` 브랜치를 `main`에 직접 병합하고 Actions와 공개 URL을 확인합니다.
