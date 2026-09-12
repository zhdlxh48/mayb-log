import type { Infer, SuperValidated } from 'sveltekit-superforms';
import type { postSchema } from '$lib/validation/content';

export type PostEditorForm = SuperValidated<Infer<typeof postSchema>>;

export type PostEditorOptions = {
	series: { id: number; title: string }[];
	categories: { id: number; name: string }[];
};

export type EditorImage = { id: string; url: string };

export type MarkdownDiagnostic = {
	line?: number;
	column?: number;
	message: string;
	code?: string;
};
