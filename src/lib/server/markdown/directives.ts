import { z } from 'zod';
import { visit } from 'unist-util-visit';

type Tree = Parameters<typeof visit>[0];
type DirectiveNode = {
	type: 'containerDirective' | 'leafDirective' | 'textDirective';
	name: string;
	attributes?: Record<string, string | null>;
	data?: { hName?: string; hProperties?: Record<string, unknown> };
};
type ProcessorFile = { fail(message: string, node: object): never };

const noteAttributes = z
	.object({ type: z.enum(['info', 'warning', 'success', 'error']).default('info') })
	.strict();

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
			if (directive.name !== 'note') return;
			if (directive.type !== 'containerDirective')
				file.fail('`note`는 :::note 블록 문법을 사용하세요.', directive);
			const parsed = noteAttributes.safeParse(directive.attributes ?? {});
			const type = parsed.success
				? parsed.data.type
				: file.fail('`note`의 type은 info, warning, success, error 중 하나여야 합니다.', directive);
			directive.data = {
				hName: 'aside',
				hProperties: { className: ['note', `note-${type}`] }
			};
		});
	};
}
