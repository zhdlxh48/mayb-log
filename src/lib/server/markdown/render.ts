import { fromHtml } from 'hast-util-from-html';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { remarkDirectives } from './directives';

type MarkdownNode = { type: string; value?: string };
type Tree = Parameters<typeof visit>[0];
type HastElement = { type: string; tagName: string; properties: Record<string, unknown> };
type ProcessorFile = { data: Record<string, unknown> };

export type MarkdownDiagnostic = {
	line?: number;
	column?: number;
	message: string;
	code?: string;
};
function allowOnlyIframeHtml() {
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

function secureIframeSources() {
	return (tree: Tree) => {
		visit(tree, 'element', (node) => {
			const element = node as HastElement;
			if (element.tagName !== 'iframe') return;
			const src = element.properties.src;
			if (typeof src !== 'string' || !/^https?:\/\//i.test(src)) delete element.properties.src;
		});
	};
}

function findFirstImage() {
	return (tree: Tree, file: ProcessorFile) => {
		visit(tree, 'image', (node) => {
			const image = node as { url?: string };
			if (!file.data.firstImage && image.url && /^(?:https?:\/\/|\/)/i.test(image.url)) {
				file.data.firstImage = image.url;
			}
		});
	};
}

const schema = {
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

const renderer = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkDirective)
	.use(remarkDirectives)
	.use(findFirstImage)
	.use(allowOnlyIframeHtml)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(secureIframeSources)
	.use(rehypeSanitize, schema)
	.use(rehypeHighlight, { detect: false })
	.use(rehypeStringify);

export async function renderMarkdownDocument(markdown: string) {
	const file = await renderer.process(markdown);
	return {
		html: String(file),
		firstImage: typeof file.data.firstImage === 'string' ? file.data.firstImage : null,
		diagnostics: file.messages.map((message): MarkdownDiagnostic => ({
			...(message.line === undefined ? {} : { line: message.line }),
			...(message.column === undefined ? {} : { column: message.column }),
			message: message.reason,
			...(message.ruleId ? { code: message.ruleId } : {})
		}))
	};
}

export async function renderMarkdown(markdown: string) {
	return (await renderMarkdownDocument(markdown)).html;
}
