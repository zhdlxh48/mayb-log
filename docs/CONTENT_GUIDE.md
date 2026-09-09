# 콘텐츠 작성 가이드

글은 로그인한 active 사용자가 `/posts/new`에서 작성한다. 제목, 설명, Markdown 본문은 필수다. 공개 글은 Draft를 끄며, 발행 시각을 비워 두면 저장 시각을 사용한다. Noindex 글은 목록·검색·RSS에는 보이지만 Sitemap에서는 제외된다.

Series는 글을 순서 있는 묶음으로 분류한다. 기존 Series를 고르거나 새 이름을 입력하며 둘을 동시에 쓰지 않는다. Categories는 여러 개를 선택할 수 있고, 새 이름은 쉼표로 구분한다. Tags도 쉼표로 구분하며 별도 테이블 없이 글에 저장된다.

이미지는 편집 화면에서 고른다. 브라우저가 긴 변 1600px 이하의 WebP(quality 약 0.82)로 압축하고, 서버는 한 번에 최대 6개와 파일당 4MiB를 허용한다. Insert를 누르면 Markdown 경로가 본문에 들어간다. 이미지 대체 텍스트를 반드시 입력한다. 기존 이미지의 X는 삭제 예정 표시이며 Save가 성공한 뒤 R2에서 지워진다. 본문 링크는 자동으로 지워지지 않는다.

일반 Markdown, GFM 표, fenced code를 사용할 수 있다. 외부·상대·anchor 링크와 외부 이미지를 허용한다. 서버 저장 결과는 일반 raw HTML을 글자로 표시하고, `iframe`만 `sanitize-html` 허용 목록으로 정리해 실제 요소로 저장한다. 허용 속성은 `src`, `title`, `width`, `height`, `loading`, `allow`, `allowfullscreen`, `referrerpolicy`, `sandbox`이며 `src`는 HTTP/HTTPS만 가능하다. 편집기의 Preview는 작성 편의를 위해 raw HTML을 그대로 미리 보이므로 공개 결과와 다를 수 있다.

글 삭제는 상세 화면이 아니라 편집 화면 맨 아래에서 수행한다. Series와 Category 삭제도 각 편집 화면에 있다. 샘플 콘텐츠를 없애려면 게시글 편집 화면에서 두 샘플 글을 삭제한 뒤 Series와 Categories를 정리한다. 운영 사용자 계정은 삭제하지 않는다.
