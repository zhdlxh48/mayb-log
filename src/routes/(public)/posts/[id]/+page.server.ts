import { error } from '@sveltejs/kit';
import { positiveIntegerParam } from '$lib/params';
import { getPublishedPost, getSeriesNeighbors } from '$lib/server/db/queries/posts/read';
import { requestDb } from '$lib/server/db/request';
import { renderMarkdownDocument } from '$lib/server/markdown/render';
import type { PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ params, platform }) => {
	const id = positiveIntegerParam(params.id);
	if (id === null) error(404, m.post_not_found());
	const db = requestDb(platform);
	const post = await getPublishedPost(db, id);
	if (!post) error(404, m.post_not_found());
	const rendered = await renderMarkdownDocument(post.bodyMarkdown);
	return {
		post,
		html: rendered.html,
		image: rendered.firstImage,
		neighbors: await getSeriesNeighbors(db, post)
	};
};
