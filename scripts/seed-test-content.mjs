import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

/** Fixed acceptance content, independent of the owner's real posts and profile. */
export async function seedTestContent(root) {
  async function write(path, content) {
    const destination = resolve(root, 'src/content', path);
    await mkdir(resolve(destination, '..'), { recursive: true });
    await writeFile(destination, content);
  }
  await write('authors/owner.yml', 'name: Test Author\nbio: 검증용 작성자\nhomepage: https://example.com/\n');
  await write('series/blog-notes.yml', 'title: 테스트 시리즈\norder: 1\n');
  await write('pages/about.md', '---\ntitle: About\ndescription: 검증용 소개\n---\n\n## 기록\n\nAstro 블로그 검증 페이지입니다.\n');
  await write('posts/first-note/index.md', `---
title: Astro와 기록
description: 다양한 본문 요소를 검증합니다.
authors: [owner]
publishedAt: 2026-09-07T00:00:00+09:00
tags: [Astro, 기록]
categories: [개발]
series: blog-notes
seriesOrder: 1
thumbnail: ./images/tiny.jpg
thumbnailAlt: 검증 이미지
---

## 본문

::::details{summary="바깥 설명"}
:::details{summary="안쪽 설명"}
중첩 내용입니다.
:::
::::

::youtube{id="aqz-KE-bpKQ" title="Test video"}

:::figure{caption="SVG 그림"}
![검증 그림](./images/diagram.svg)
:::
`);
  await write('posts/markdown-notes/index.md', `---
title: Markdown으로 쓰는 글
description: 썸네일 없는 표와 글
authors: [owner]
publishedAt: 2026-08-31T15:00:00Z
tags: [Astro]
categories: [개발]
series: blog-notes
seriesOrder: 2
---

## 표

| 제목 | 설명 |
| --- | --- |
| 기록 | 내용 |
`);
  await write('posts/archive-note/index.md', '---\ntitle: 오래된 기록\ndescription: noindex 공개 글\nauthors: [owner]\npublishedAt: 2025-12-20T00:00:00+09:00\ntags: [기록]\nseo:\n  noindex: true\n---\n\n기록을 검색할 수 있습니다.\n');
  await write('posts/first-note/images/diagram.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160"><rect width="640" height="160" fill="#e5e9ed"/></svg>');
  await sharp({ create: { width: 320, height: 240, channels: 3, background: '#446581' } }).jpeg().toFile(resolve(root, 'src/content/posts/first-note/images/tiny.jpg'));
}
