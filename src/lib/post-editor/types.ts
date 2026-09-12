export type PostEditorForm = {
	data: {
		title: string;
		subtitle: string;
		description: string;
		bodyMarkdown: string;
		seriesId: number | null;
		seriesPosition: number | null;
		categories: number[];
		tags: string;
		publishedAt: string;
		noindex: boolean;
	};
	errors: {
		title?: string[];
		description?: string[];
		bodyMarkdown?: string[];
		seriesPosition?: string[];
		tags?: string[];
		categories?: { _errors?: string[] };
		publishedAt?: string[];
	};
};

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
