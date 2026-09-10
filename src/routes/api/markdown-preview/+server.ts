import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth/guards';
import { renderMarkdown } from '$lib/server/markdown/render';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

const MAX_MARKDOWN_BYTES = 1024 * 1024;

export const POST: RequestHandler = async ({ request }) => {
	requireUser();
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_MARKDOWN_BYTES) error(413, m.markdown_too_large());
	const data: unknown = await request.json();
	const bodyMarkdown =
		data && typeof data === 'object' && 'bodyMarkdown' in data ? data.bodyMarkdown : null;
	if (typeof bodyMarkdown !== 'string') error(400, m.markdown_required());
	if (new TextEncoder().encode(bodyMarkdown).byteLength > MAX_MARKDOWN_BYTES)
		error(413, m.markdown_too_large());
	return json({ html: await renderMarkdown(bodyMarkdown) });
};
