import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth/guards';
import { renderMarkdownDocument } from '$lib/server/markdown/render';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';
import { MAX_MARKDOWN_BYTES, MAX_PREVIEW_REQUEST_BYTES } from '$lib/limits';

export const POST: RequestHandler = async ({ request }) => {
	requireUser();
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_PREVIEW_REQUEST_BYTES) error(413, m.markdown_too_large());
	const data: unknown = await request.json();
	const bodyMarkdown =
		data && typeof data === 'object' && 'bodyMarkdown' in data ? data.bodyMarkdown : null;
	if (typeof bodyMarkdown !== 'string') error(400, m.markdown_required());
	if (new TextEncoder().encode(bodyMarkdown).byteLength > MAX_MARKDOWN_BYTES)
		error(413, m.markdown_too_large());
	const { html, diagnostics } = await renderMarkdownDocument(bodyMarkdown);
	return json({ html, diagnostics });
};
