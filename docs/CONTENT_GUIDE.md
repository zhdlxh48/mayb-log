# 콘텐츠 작성 가이드

글은 브라우저에서 로그인한 뒤 `/posts/new`에서 작성합니다. Markdown 원문은 D1의 `body_markdown`에 저장되고, 공개 화면은 저장할 때 Marked로 만든 `body_html`을 사용합니다.

## 계정 준비

Login 페이지의 Sign up 링크로 가입하면 계정은 `pending` 상태가 됩니다. Cloudflare D1 Console에서 다음 SQL을 한 번 실행해 활성화합니다.

```sql
UPDATE users SET status = 'active', updated_at = unixepoch()
WHERE username = '내아이디';
```

## 글 입력

- **Title, Description, Markdown**은 필수입니다.
- Draft를 끄면 공개됩니다. 발행일을 비우면 저장 시각을 사용합니다.
- Series는 기존 항목 하나를 선택하거나 새 이름 하나를 입력합니다.
- Categories는 기존 항목을 여러 개 선택하고 새 이름도 쉼표로 추가할 수 있습니다.
- Tags는 쉼표로 구분합니다. 별도 관리 화면이나 테이블은 없습니다.
- Noindex 글은 공개 목록과 내부 검색에는 나오지만 Sitemap에서는 빠집니다.

## 이미지

파일을 선택하면 브라우저에서 긴 변 1600px 이하 WebP로 압축합니다. Insert는 커서 위치에 다음 문법을 넣습니다.

```markdown
![대체 텍스트](/media/posts/{post_uuid}/{image_uuid}.webp)
```

새 글의 이미지는 Save 전까지 브라우저 메모리에만 있습니다. 편집 화면은 R2 prefix를 직접 읽어 Used/Unused를 표시합니다. X는 삭제 예정으로만 표시하며, 실제 삭제는 글 저장이 성공한 뒤 수행합니다. Markdown 링크는 자동으로 지우지 않습니다.

## 샘플 삭제

샘플 글을 열고 X를 누르면 글과 연결 관계, FTS row가 지워지고 해당 글의 R2 prefix도 정리됩니다. 샘플 Series와 Category는 각 Edit 화면에서 별도로 삭제합니다.
