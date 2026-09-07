import type {} from 'remark-directive';
import type { Root, Paragraph } from 'mdast';
import type { Element, ElementContent, Properties } from 'hast';
import { visit } from 'unist-util-visit';

// These are the standard remark-to-HTML fields attached to Markdown nodes.
declare module 'mdast' {
  interface Data { hName?: string; hProperties?: Properties; hChildren?: ElementContent[] }
}

const supported = ['callout', 'details', 'figure', 'social', 'youtube', 'link-card', 'metric'];
const element = (tagName: string, children: ElementContent[] = [], properties: Properties = {}): Element => ({ type: 'element', tagName, properties, children });
const text = (value: string): ElementContent => ({ type: 'text', value });
const paragraph = (value: string, tagName: string): Paragraph => ({ type: 'paragraph', data: { hName: tagName }, children: [{ type: 'text', value }] });

/** Convert only the seven documented directives; Markdown images stay untouched. */
export default function directives() {
  return (tree: Root, file: { path?: string }) => {
    visit(tree, node => {
      if (node.type !== 'containerDirective' && node.type !== 'leafDirective' && node.type !== 'textDirective') return;
      const fail = (message: string): never => { throw new Error(`${file.path ?? 'Markdown'}:${node.position?.start.line ?? '?'} ${message}`); };
      if (!supported.includes(node.name)) fail(`Unknown directive: ${node.name}. 지원: ${supported.join(', ')}`);
      const container = ['callout', 'details', 'figure'].includes(node.name);
      if (node.type !== (container ? 'containerDirective' : 'leafDirective')) fail(`${node.name}: ${container ? ':::' : '::'} 문법을 사용하세요.`);
      const attrs = node.attributes ?? {};
      const required = (key: string) => attrs[key]?.trim() || fail(`${node.name}: 필수 속성 ${key} 누락`);
      const choice = (key: string, values: string[], fallback?: string) => {
        const value = attrs[key] ?? fallback ?? required(key);
        if (!values.includes(value)) fail(`${node.name}: ${key}는 ${values.join(', ')} 중 하나여야 합니다.`);
        return value;
      };
      const link = () => {
        const value = required('url');
        let parsed: URL;
        try { parsed = new URL(value); } catch { return fail(`${node.name}: 유효한 절대 URL이 필요합니다.`); }
        if (!['http:', 'https:'].includes(parsed.protocol)) fail(`${node.name}: HTTP(S) URL만 허용합니다.`);
        return parsed.href;
      };
      const data = node.data ??= {};
      switch (node.name) {
        case 'callout': {
          const type = choice('type', ['note', 'info', 'tip', 'warning', 'danger'], 'note');
          data.hName = 'aside';
          data.hProperties = { className: ['directive', 'callout', `callout-${type}`] };
          if (attrs.title && node.type === 'containerDirective') node.children.unshift(paragraph(attrs.title, 'strong'));
          break;
        }
        case 'details':
          data.hName = 'details';
          data.hProperties = { className: ['directive', 'article-details'] };
          if (node.type === 'containerDirective') node.children.unshift(paragraph(required('summary'), 'summary'));
          break;
        case 'figure':
          data.hName = 'figure';
          if ((attrs.caption || attrs.credit) && node.type === 'containerDirective') node.children.push(paragraph([attrs.caption, attrs.credit && `© ${attrs.credit}`].filter(Boolean).join(' · '), 'figcaption'));
          break;
        case 'link-card':
        case 'social': {
          const title = required(node.name === 'social' ? 'label' : 'title');
          const platform = node.name === 'social' ? choice('platform', ['x', 'instagram', 'github', 'bluesky', 'mastodon', 'generic']) : undefined;
          data.hName = 'div';
          data.hProperties = { className: ['directive', 'link-card'] };
          data.hChildren = [element('a', [text(title)], { href: link() })];
          if (platform) data.hChildren.push(element('small', [text(platform)]));
          if (attrs.description) data.hChildren.push(element('p', [text(attrs.description)]));
          break;
        }
        case 'metric':
          data.hName = 'dl';
          data.hProperties = { className: ['directive', 'metric', `metric-${choice('status', ['good', 'warning', 'bad', 'neutral'], 'neutral')}`] };
          data.hChildren = [element('dt', [text(required('label'))]), element('dd', [text(`${required('value')}${attrs.unit ? ` ${attrs.unit}` : ''}`)])];
          break;
        case 'youtube': {
          const id = required('id');
          if (!/^[\w-]{11}$/.test(id)) fail('youtube: id는 11자의 YouTube 영상 ID여야 합니다.');
          const title = required('title');
          data.hName = 'div';
          data.hProperties = { className: ['directive', 'youtube'], 'data-youtube': id, 'data-title': title };
          data.hChildren = [
            element('button', [text(`▶ ${title} 재생`)], { type: 'button', hidden: true }),
            element('a', [text(`${title} — YouTube에서 보기 ↗`)], { href: `https://www.youtube.com/watch?v=${id}` }),
          ];
          break;
        }
      }
    });
  };
}
