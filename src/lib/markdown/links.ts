import type { Root } from 'hast';
import { visit } from 'unist-util-visit';
import { site } from '../../config/site.ts';
import { url } from '../urls.ts';

/** Root-relative Markdown links should work under GitHub Pages' project base. */
export default function markdownLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      const href = node.properties.href;
      if (
        node.tagName !== 'a' ||
        typeof href !== 'string' ||
        !href.startsWith('/') ||
        href.startsWith('//')
      )
        return;
      const target = new URL(href, site.origin);
      if (target.pathname === site.base || target.pathname.startsWith(`${site.base}/`)) return;
      node.properties.href = url(decodeURIComponent(target.pathname)) + target.search + target.hash;
    });
  };
}
