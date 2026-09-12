import { fromHtml } from 'hast-util-from-html';
import { defaultSchema } from 'rehype-sanitize';
import { visit } from 'unist-util-visit';

type MarkdownNode = { type: string; value?: string };
type Tree = Parameters<typeof visit>[0];
type HastElement = { type: string; tagName: string; properties: Record<string, unknown> };

export function allowOnlyIframeHtml() {
	return (tree: Tree) => {
		visit(tree, 'html', (node) => {
			const html = node as MarkdownNode;
			const fragment = fromHtml(html.value ?? '', { fragment: true });
			const content = fragment.children.filter(
				(child) => child.type !== 'text' || child.value.trim().length > 0
			);
			if (
				content.length !== 1 ||
				content[0]?.type !== 'element' ||
				content[0].tagName !== 'iframe'
			) {
				html.type = 'text';
			}
		});
	};
}

export function secureIframeSources() {
	return (tree: Tree) => {
		visit(tree, 'element', (node) => {
			const element = node as HastElement;
			if (element.tagName !== 'iframe') return;
			const src = element.properties.src;
			if (typeof src !== 'string' || !/^https?:\/\//i.test(src)) delete element.properties.src;
		});
	};
}

export const htmlSanitizerSchema = {
	...defaultSchema,
	tagNames: [...(defaultSchema.tagNames ?? []), 'iframe', 'aside'],
	attributes: {
		...defaultSchema.attributes,
		aside: ['className'],
		iframe: [
			'src',
			'title',
			'width',
			'height',
			'loading',
			'allow',
			'allowFullScreen',
			'referrerPolicy',
			'sandbox'
		]
	},
	protocols: { ...defaultSchema.protocols, src: ['http', 'https'] }
};
