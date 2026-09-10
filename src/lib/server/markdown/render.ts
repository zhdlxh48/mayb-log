import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

type MarkdownNode = {
	type: string;
	value?: string;
	children?: MarkdownNode[];
};

function keepOnlyIframeHtml() {
	return (tree: MarkdownNode) => {
		const visit = (node: MarkdownNode) => {
			if (node.type === 'html' && !node.value?.trimStart().toLowerCase().startsWith('<iframe')) {
				node.type = 'text';
			}
			node.children?.forEach(visit);
		};
		visit(tree);
	};
}

const schema = {
	...defaultSchema,
	tagNames: [...(defaultSchema.tagNames ?? []), 'iframe'],
	attributes: {
		...defaultSchema.attributes,
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
	.use(keepOnlyIframeHtml)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSanitize, schema)
	.use(rehypeHighlight, { detect: false })
	.use(rehypeStringify);

export async function renderMarkdown(markdown: string) {
	return String(await renderer.process(markdown));
}
