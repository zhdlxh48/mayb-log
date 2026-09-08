INSERT INTO users (username,display_name,password_hash,password_salt,password_iterations,role,status,bio,homepage,same_as,created_at,updated_at) VALUES ('owner','MayB','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=','AAAAAAAAAAAAAAAAAAAAAA==',600000,'author','inactive','개발과 일상에서 배운 것을 기록합니다.','https://github.com/zhdlxh48','["https://github.com/zhdlxh48"]',1788793200,1788793200);

INSERT INTO series (slug,title,description,sort_order) VALUES ('blog-notes','블로그 개발 노트','작고 오래 유지할 수 있는 블로그를 만드는 기록입니다.',10);

INSERT INTO content (kind,slug,title,description,body_markdown,body_html,body_text,search_text,author_user_id,published_at,updated_at,draft,noindex) VALUES ('page','about','About','개발과 일상의 생각을 기록하는 MayB의 개인 아카이브.','안녕하세요. **MayB**입니다.

개발하면서 배운 것, 오래 기억하고 싶은 생각, 일상의 작은 발견을 이곳에 기록합니다.

## 이곳의 기록

글은 시리즈, 주제, 태그, 작성일로 찾아볼 수 있습니다.

## Elsewhere

- [GitHub — zhdlxh48](https://github.com/zhdlxh48)

---

_초기 소개와 샘플 글은 자유롭게 수정하거나 삭제하세요._','<p>안녕하세요. <strong>MayB</strong>입니다.</p>
<p>개발하면서 배운 것, 오래 기억하고 싶은 생각, 일상의 작은 발견을 이곳에 기록합니다.</p>
<h2>이곳의 기록</h2>
<p>글은 시리즈, 주제, 태그, 작성일로 찾아볼 수 있습니다.</p>
<h2>Elsewhere</h2>
<ul>
<li><a href="https://github.com/zhdlxh48">GitHub — zhdlxh48</a></li>
</ul>
<hr>
<p><em>초기 소개와 샘플 글은 자유롭게 수정하거나 삭제하세요.</em></p>
','안녕하세요. mayb 입니다. 개발하면서 배운 것, 오래 기억하고 싶은 생각, 일상의 작은 발견을 이곳에 기록합니다. 이곳의 기록 글은 시리즈, 주제, 태그, 작성일로 찾아볼 수 있습니다. elsewhere github — zhdlxh48 초기 소개와 샘플 글은 자유롭게 수정하거나 삭제하세요.','about 개발과 일상의 생각을 기록하는 mayb의 개인 아카이브. 안녕하세요. mayb 입니다. 개발하면서 배운 것, 오래 기억하고 싶은 생각, 일상의 작은 발견을 이곳에 기록합니다. 이곳의 기록 글은 시리즈, 주제, 태그, 작성일로 찾아볼 수 있습니다. elsewhere github — zhdlxh48 초기 소개와 샘플 글은 자유롭게 수정하거나 삭제하세요. mayb',1,1788793200,1788793200,0,0);

INSERT INTO content (kind,slug,title,subtitle,description,body_markdown,body_html,body_text,search_text,author_user_id,categories,tags,series_id,series_order,image_key,image_alt,published_at,updated_at,draft,noindex) VALUES ('post','first-note','작은 블로그를 시작하며','기록을 오래 남기기 위한 몇 가지 선택','문서 중심의 작은 블로그를 만들며 선택한 구조와 기록의 방식을 소개합니다.','기록은 다시 읽을 수 있을 때 가치가 생깁니다. 이 글은 **삭제해도 되는 샘플**입니다.

## 문서가 먼저

페이지를 열면 글이 먼저 보이고, 링크를 누르면 다음 문서로 이동합니다.

## 작게 시작하기

- Markdown으로 글을 씁니다.
- 글은 저장할 때 HTML과 검색 텍스트로 변환됩니다.
- 시리즈와 태그는 서로 다른 탐색 방법을 제공합니다.

```ts
const archive = [''기록'', ''배움'', ''일상''];
console.log(archive.join('' · ''));
```

> 새로운 기능을 더하기 전에 지금의 코드가 읽기 쉬운지 먼저 살펴봅니다.

![Markdown에서 Worker까지](/media/media/legacy/first-note/diagram.svg)

*Markdown에서 Worker까지 · MayB*

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [GitHub에서 더 보기](https://github.com/zhdlxh48)

| 예시 측정값 | 값 |
| --- | --- |
| 응답 | 동적 HTML |

## 이미지 크기 검증

![2400×1800 원본](/media/media/legacy/first-note/landscape.jpg)

![1600×1000 PNG 원본](/media/media/legacy/first-note/screen.png)

![1200×900 원본](/media/media/legacy/first-note/small.jpg)

![900×2400 세로 원본](/media/media/legacy/first-note/portrait.jpg)

![320×240 작은 원본](/media/media/legacy/first-note/tiny.jpg)','<p>기록은 다시 읽을 수 있을 때 가치가 생깁니다. 이 글은 <strong>삭제해도 되는 샘플</strong>입니다.</p>
<h2>문서가 먼저</h2>
<p>페이지를 열면 글이 먼저 보이고, 링크를 누르면 다음 문서로 이동합니다.</p>
<h2>작게 시작하기</h2>
<ul>
<li>Markdown으로 글을 씁니다.</li>
<li>글은 저장할 때 HTML과 검색 텍스트로 변환됩니다.</li>
<li>시리즈와 태그는 서로 다른 탐색 방법을 제공합니다.</li>
</ul>
<pre><code class="language-ts">const archive = [&#39;기록&#39;, &#39;배움&#39;, &#39;일상&#39;];
console.log(archive.join(&#39; · &#39;));
</code></pre>
<blockquote>
<p>새로운 기능을 더하기 전에 지금의 코드가 읽기 쉬운지 먼저 살펴봅니다.</p>
</blockquote>
<p><img src="/media/media/legacy/first-note/diagram.svg" alt="Markdown에서 Worker까지" loading="lazy"></p>
<p><em>Markdown에서 Worker까지 · MayB</em></p>
<ul>
<li><a href="https://developers.cloudflare.com/workers/">Cloudflare Workers 문서</a></li>
<li><a href="https://github.com/zhdlxh48">GitHub에서 더 보기</a></li>
</ul>
<table>
<thead>
<tr>
<th>예시 측정값</th>
<th>값</th>
</tr>
</thead>
<tbody><tr>
<td>응답</td>
<td>동적 HTML</td>
</tr>
</tbody></table>
<h2>이미지 크기 검증</h2>
<p><img src="/media/media/legacy/first-note/landscape.jpg" alt="2400×1800 원본" loading="lazy"></p>
<p><img src="/media/media/legacy/first-note/screen.png" alt="1600×1000 PNG 원본" loading="lazy"></p>
<p><img src="/media/media/legacy/first-note/small.jpg" alt="1200×900 원본" loading="lazy"></p>
<p><img src="/media/media/legacy/first-note/portrait.jpg" alt="900×2400 세로 원본" loading="lazy"></p>
<p><img src="/media/media/legacy/first-note/tiny.jpg" alt="320×240 작은 원본" loading="lazy"></p>
','기록은 다시 읽을 수 있을 때 가치가 생깁니다. 이 글은 삭제해도 되는 샘플 입니다. 문서가 먼저 페이지를 열면 글이 먼저 보이고, 링크를 누르면 다음 문서로 이동합니다. 작게 시작하기 markdown으로 글을 씁니다. 글은 저장할 때 html과 검색 텍스트로 변환됩니다. 시리즈와 태그는 서로 다른 탐색 방법을 제공합니다. const archive = [ 기록 , 배움 , 일상 ]; console.log(archive.join( · )); 새로운 기능을 더하기 전에 지금의 코드가 읽기 쉬운지 먼저 살펴봅니다. markdown에서 worker까지 · mayb cloudflare workers 문서 github에서 더 보기 예시 측정값 값 응답 동적 html 이미지 크기 검증','작은 블로그를 시작하며 기록을 오래 남기기 위한 몇 가지 선택 문서 중심의 작은 블로그를 만들며 선택한 구조와 기록의 방식을 소개합니다. 기록은 다시 읽을 수 있을 때 가치가 생깁니다. 이 글은 삭제해도 되는 샘플 입니다. 문서가 먼저 페이지를 열면 글이 먼저 보이고, 링크를 누르면 다음 문서로 이동합니다. 작게 시작하기 markdown으로 글을 씁니다. 글은 저장할 때 html과 검색 텍스트로 변환됩니다. 시리즈와 태그는 서로 다른 탐색 방법을 제공합니다. const archive = [ 기록 , 배움 , 일상 ]; console.log(archive.join( · )); 새로운 기능을 더하기 전에 지금의 코드가 읽기 쉬운지 먼저 살펴봅니다. markdown에서 worker까지 · mayb cloudflare workers 문서 github에서 더 보기 예시 측정값 값 응답 동적 html 이미지 크기 검증 mayb 블로그 개발 노트 개발 일상 기록 cloudflare',1,'["개발","일상"]','["기록","Cloudflare"]','blog-notes',1,'media/legacy/first-note/thumbnail.jpg','파란색과 밝은 회색으로 나뉜 이미지 처리 검증용 패턴',1788724800,1788724800,0,0);

INSERT INTO content (kind,slug,title,subtitle,description,body_markdown,body_html,body_text,search_text,author_user_id,categories,tags,series_id,series_order,image_key,image_alt,published_at,updated_at,draft,noindex) VALUES ('post','archive-note','날짜를 따라 기록을 찾는 방법',NULL,'한국 시간 기준으로 연도와 월을 나누어 오래된 기록을 찾아봅니다.','이 글은 날짜별 탐색과 `noindex`를 확인하기 위한 **샘플**입니다.

사이트에서는 읽을 수 있지만 검색 엔진용 Sitemap에는 포함되지 않습니다.

## 같은 순간, 다른 날짜

UTC의 하루와 서울의 하루는 시작하는 시각이 다릅니다. 이 블로그의 날짜 표기와 Archive는 모두 서울 시간을 기준으로 합니다.','<p>이 글은 날짜별 탐색과 <code>noindex</code>를 확인하기 위한 <strong>샘플</strong>입니다.</p>
<p>사이트에서는 읽을 수 있지만 검색 엔진용 Sitemap에는 포함되지 않습니다.</p>
<h2>같은 순간, 다른 날짜</h2>
<p>UTC의 하루와 서울의 하루는 시작하는 시각이 다릅니다. 이 블로그의 날짜 표기와 Archive는 모두 서울 시간을 기준으로 합니다.</p>
','이 글은 날짜별 탐색과 noindex 를 확인하기 위한 샘플 입니다. 사이트에서는 읽을 수 있지만 검색 엔진용 sitemap에는 포함되지 않습니다. 같은 순간, 다른 날짜 utc의 하루와 서울의 하루는 시작하는 시각이 다릅니다. 이 블로그의 날짜 표기와 archive는 모두 서울 시간을 기준으로 합니다.','날짜를 따라 기록을 찾는 방법 한국 시간 기준으로 연도와 월을 나누어 오래된 기록을 찾아봅니다. 이 글은 날짜별 탐색과 noindex 를 확인하기 위한 샘플 입니다. 사이트에서는 읽을 수 있지만 검색 엔진용 sitemap에는 포함되지 않습니다. 같은 순간, 다른 날짜 utc의 하루와 서울의 하루는 시작하는 시각이 다릅니다. 이 블로그의 날짜 표기와 archive는 모두 서울 시간을 기준으로 합니다. mayb 일상 기록 시간',1,'["일상"]','["기록","시간"]',NULL,NULL,NULL,NULL,1766223000,1766223000,0,1);

INSERT INTO content (kind,slug,title,subtitle,description,body_markdown,body_html,body_text,search_text,author_user_id,categories,tags,series_id,series_order,image_key,image_alt,published_at,updated_at,draft,noindex) VALUES ('post','markdown-notes','Markdown으로 읽기 좋은 글 쓰기',NULL,'제목, 표, 코드와 이미지를 이용해 내용을 명확하게 정리하는 방법을 살펴봅니다.','썸네일이 없는 **샘플 글**입니다. 이미지 없이도 제목과 설명이 자연스럽게 배치됩니다.

## 글의 구조

| 요소 | 목적 |
| --- | --- |
| 제목 | 문서의 구조를 보여 줍니다 |
| 설명 | 글의 내용을 간단히 소개합니다 |
| 링크 | 관련된 기록으로 연결합니다 |

> 잘 정리한 글은 미래의 나에게 보내는 친절한 메모입니다.

### 확인 목록

- [x] 간결한 제목
- [x] 의미 있는 소제목
- [ ] 나만의 첫 글 작성

~~너무 많은 장식~~ 대신 읽기 편한 문장을 남깁니다.

[Marked 공식 사이트](https://marked.js.org/)

[Big Buck Bunny 샘플 영상](https://www.youtube.com/watch?v=aqz-KE-bpKQ)

![작은 이미지 처리 예시](/media/media/legacy/markdown-notes/tiny.jpg)','<p>썸네일이 없는 <strong>샘플 글</strong>입니다. 이미지 없이도 제목과 설명이 자연스럽게 배치됩니다.</p>
<h2>글의 구조</h2>
<table>
<thead>
<tr>
<th>요소</th>
<th>목적</th>
</tr>
</thead>
<tbody><tr>
<td>제목</td>
<td>문서의 구조를 보여 줍니다</td>
</tr>
<tr>
<td>설명</td>
<td>글의 내용을 간단히 소개합니다</td>
</tr>
<tr>
<td>링크</td>
<td>관련된 기록으로 연결합니다</td>
</tr>
</tbody></table>
<blockquote>
<p>잘 정리한 글은 미래의 나에게 보내는 친절한 메모입니다.</p>
</blockquote>
<h3>확인 목록</h3>
<ul>
<li><input checked="" disabled="" type="checkbox"> 간결한 제목</li>
<li><input checked="" disabled="" type="checkbox"> 의미 있는 소제목</li>
<li><input disabled="" type="checkbox"> 나만의 첫 글 작성</li>
</ul>
<p><del>너무 많은 장식</del> 대신 읽기 편한 문장을 남깁니다.</p>
<p><a href="https://marked.js.org/">Marked 공식 사이트</a></p>
<p><a href="https://www.youtube.com/watch?v=aqz-KE-bpKQ">Big Buck Bunny 샘플 영상</a></p>
<p><img src="/media/media/legacy/markdown-notes/tiny.jpg" alt="작은 이미지 처리 예시" loading="lazy"></p>
','썸네일이 없는 샘플 글 입니다. 이미지 없이도 제목과 설명이 자연스럽게 배치됩니다. 글의 구조 요소 목적 제목 문서의 구조를 보여 줍니다 설명 글의 내용을 간단히 소개합니다 링크 관련된 기록으로 연결합니다 잘 정리한 글은 미래의 나에게 보내는 친절한 메모입니다. 확인 목록 간결한 제목 의미 있는 소제목 나만의 첫 글 작성 너무 많은 장식 대신 읽기 편한 문장을 남깁니다. marked 공식 사이트 big buck bunny 샘플 영상','markdown으로 읽기 좋은 글 쓰기 제목, 표, 코드와 이미지를 이용해 내용을 명확하게 정리하는 방법을 살펴봅니다. 썸네일이 없는 샘플 글 입니다. 이미지 없이도 제목과 설명이 자연스럽게 배치됩니다. 글의 구조 요소 목적 제목 문서의 구조를 보여 줍니다 설명 글의 내용을 간단히 소개합니다 링크 관련된 기록으로 연결합니다 잘 정리한 글은 미래의 나에게 보내는 친절한 메모입니다. 확인 목록 간결한 제목 의미 있는 소제목 나만의 첫 글 작성 너무 많은 장식 대신 읽기 편한 문장을 남깁니다. marked 공식 사이트 big buck bunny 샘플 영상 mayb 블로그 개발 노트 개발 markdown 글쓰기',1,'["개발"]','["Markdown","글쓰기"]','blog-notes',2,NULL,NULL,1788188400,1788307200,0,0);
