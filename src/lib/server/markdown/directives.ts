import { z } from 'zod';
import { visit } from 'unist-util-visit';

type Tree = Parameters<typeof visit>[0];
type DirectiveNode = {
	type: 'containerDirective' | 'leafDirective' | 'textDirective';
	name: string;
	attributes?: Record<string, string | null>;
	data?: { hName?: string; hProperties?: Record<string, unknown> };
	children?: unknown[];
	value?: string;
	position?: {
		start: { offset?: number };
		end: { offset?: number };
	};
};
type ProcessorFile = {
	value: unknown;
	message(message: string, node: object, origin: string): unknown;
};

const noteAttributes = z
	.object({ type: z.enum(['info', 'warning', 'success', 'error']).default('info') })
	.strict();

function directiveSource(node: DirectiveNode, file: ProcessorFile) {
	const start = node.position?.start.offset;
	const end = node.position?.end.offset;
	if (typeof file.value === 'string' && typeof start === 'number' && typeof end === 'number')
		return file.value.slice(start, end);
	const marker =
		node.type === 'containerDirective' ? ':::' : node.type === 'leafDirective' ? '::' : ':';
	return `${marker}${node.name}`;
}

function literalDirective(node: DirectiveNode, file: ProcessorFile, message: string, code: string) {
	file.message(message, node, `mayb-log:${code}`);
	const source = directiveSource(node, file);
	const replacement = node as unknown as Record<string, unknown>;
	replacement.type = node.type === 'textDirective' ? 'inlineCode' : 'code';
	replacement.value = source;
	delete replacement.name;
	delete replacement.attributes;
	delete replacement.data;
	delete replacement.children;
}

export function remarkDirectives() {
	return (tree: Tree, file: ProcessorFile) => {
		visit(tree, (node) => {
			if (
				node.type !== 'containerDirective' &&
				node.type !== 'leafDirective' &&
				node.type !== 'textDirective'
			)
				return;
			const directive = node as DirectiveNode;
			if (directive.name !== 'note') {
				literalDirective(
					directive,
					file,
					`Unknown directive \`${directive.name}\`.`,
					'unknown-directive'
				);
				return;
			}
			if (directive.type !== 'containerDirective') {
				literalDirective(
					directive,
					file,
					'The `note` directive must use container syntax (`:::note`).',
					'directive-kind'
				);
				return;
			}
			const parsed = noteAttributes.safeParse(directive.attributes ?? {});
			if (!parsed.success) {
				literalDirective(
					directive,
					file,
					'The `note` type must be one of: info, warning, success, error.',
					'directive-attributes'
				);
				return;
			}
			directive.data = {
				hName: 'aside',
				hProperties: { className: ['note', `note-${parsed.data.type}`] }
			};
		});
	};
}
