import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { remarkDirectives } from './directives';
import { allowOnlyIframeHtml, htmlSanitizerSchema, secureIframeSources } from './html-policy';

type Tree = Parameters<typeof visit>[0];
type ProcessorFile = { data: Record<string, unknown> };

export type MarkdownDiagnostic = {
	line?: number;
	column?: number;
	message: string;
	code?: string;
};

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
	.use(rehypeSanitize, htmlSanitizerSchema)
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
