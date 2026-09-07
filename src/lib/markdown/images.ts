import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import { imageOptions } from '../images.ts';

/** Add transform options before Astro's own image plugin runs. No image is encoded here. */
export default function markdownImages() {
  return async (tree: Root, file: { path?: string }) => {
    const images: Element[] = [];
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img' && !String(node.properties.alt ?? '').trim())
        throw new Error(`${file.path}: 본문 이미지의 alt 설명이 필요합니다.`);
      if (
        node.tagName === 'img' &&
        typeof node.properties.src === 'string' &&
        node.properties.src.startsWith('.')
      )
        images.push(node);
    });
    await Promise.all(
      images.map(async (node) => {
        if (!file.path) throw new Error('Markdown 이미지의 원본 문서 경로를 찾을 수 없습니다.');
        const source = resolve(dirname(file.path), decodeURI(String(node.properties.src)));
        const metadata = await sharp(source).metadata();
        Object.assign(node.properties, imageOptions(metadata), {
          loading: 'lazy',
          decoding: 'async',
          sizes: '(max-width: 767px) calc(100vw - 40px), 720px',
        });
      }),
    );
  };
}
