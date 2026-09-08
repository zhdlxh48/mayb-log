# 콘텐츠 가이드

## 글 작성

활성 계정으로 로그인한 뒤 상단 `Write` 또는 `/admin/posts/new`를 엽니다. 일반 작성자는 자기 글만 만들고 수정할 수 있으며 관리자는 모든 글을 관리할 수 있습니다.

- **제목, 주소 이름, 설명, 본문**은 필수입니다.
- 주소 이름은 글자·숫자를 하이픈으로 연결합니다. 예: `worker-migration`, `첫-기록`.
- 카테고리와 태그는 쉼표로 구분합니다. 같은 값은 한 번만 저장됩니다.
- 시리즈를 지정하면 기존 `series.slug`와 시리즈 순서를 함께 입력합니다. 순서는 시리즈 안에서 중복될 수 없습니다.
- 공개 글은 `초안으로 저장`을 해제하고 발행일을 서울 시간으로 입력합니다.
- `검색 엔진 색인 제외` 글은 사이트 검색과 RSS에는 나오지만 Sitemap에는 포함되지 않습니다.
- 미래 발행일도 초안이 아니면 바로 공개됩니다.

Markdown 원문은 `body_markdown`, 저장 시 생성한 결과는 `body_html`, `body_text`, `search_text`에 저장됩니다. 일반 작성자의 raw HTML은 문자로 표시되며 실행되지 않습니다. 링크는 `http`, `https`, `mailto` 또는 사이트 내부 `/` 주소만 허용합니다.

지원하는 코드 fence 이름은 `js/javascript`, `ts/typescript`, `html/markup`, `css`, `json`, `bash/shell`, `sql`, `csharp`, `go`, `markdown`, `yaml`입니다.

````markdown
```ts
const message = "hello";
```
````

[Cloudflare](https://cloudflare.com/)

```

## 이미지

편집기 아래에서 JPEG, PNG, WebP 파일을 선택합니다. 브라우저가 긴 변 1600px 이하, WebP, 초기 품질 0.82로 압축하며 원본과 결과 크기를 표시합니다. 서버는 로그인·CSRF·5MB 제한·MIME·magic bytes를 다시 검사합니다. 반환된 Markdown을 본문에 붙이고 의미 있는 대체 텍스트를 작성합니다.

R2 key는 `media/{user_id}/{yyyy}/{uuid}.{ext}`이며 원래 파일명은 사용하지 않습니다. SVG 업로드는 막혀 있습니다. 저장소와 함께 제공한 검증용 SVG만 신뢰된 이전 자료로 유지합니다.

## 샘플 정리

`0002_sample_content.sql`은 About, 시리즈 하나, 샘플 글 세 개와 비활성 `owner` 작성자를 만듭니다. 새 운영 DB를 만들기 전에 샘플이 필요 없으면 이 migration을 원하는 초기 데이터로 수정합니다. 이미 적용한 DB에서는 관리자 화면에서 글을 초안으로 바꾸거나 Wrangler D1 명령으로 삭제하세요. 적용된 migration 파일은 수정하지 말고 새 번호 migration을 추가하는 편이 안전합니다.
```
